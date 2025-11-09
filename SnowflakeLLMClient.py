from __future__ import annotations

from typing import Optional

import snowflake.connector

from SnowflakeConfig import ACCOUNT, USER, PASSWORD


class SnowflakeLLMClient:
    """Client for interacting with Snowflake Cortex LLM."""

    def __init__(self) -> None:
        self.conn: Optional[snowflake.connector.SnowflakeConnection] = None
        self._connect()

    def _connect(self) -> None:
        if self.conn is not None:
            try:
                with self.conn.cursor() as cur:
                    cur.execute("SELECT 1")
                return
            except Exception:
                try:
                    self.conn.close()
                except Exception:
                    pass
                self.conn = None

        self.conn = snowflake.connector.connect(
            user=USER,
            password=PASSWORD,
            account=ACCOUNT,
        )
        print("✅ Connected to Snowflake")

    def close(self) -> None:
        if self.conn is not None:
            try:
                self.conn.close()
            finally:
                self.conn = None
                print("✅ Snowflake connection closed")

    def get_response(self, user_message: str, model: str = "mistral-7b") -> Optional[str]:
        """Get a response from the Snowflake Cortex LLM."""
        self._connect()
        escaped_message = user_message.replace("'", "''")
        query = f"""
            SELECT SNOWFLAKE.CORTEX.COMPLETE(
                '{model}',
                '{escaped_message}'
            ) AS response;
        """
        try:
            with self.conn.cursor() as cur:  # type: ignore[union-attr]
                cur.execute(query)
                row = cur.fetchone()
        except Exception as exc:
            print(f"⚠️ Error getting LLM response: {exc}. Reconnecting and retrying...")
            self.conn = None
            self._connect()
            with self.conn.cursor() as cur:  # type: ignore[union-attr]
                cur.execute(query)
                row = cur.fetchone()

        if row and row[0]:
            return row[0]
        return None

    def get_contextual_response(self, user_message: str, context: str = "", model: str = "mistral-7b") -> Optional[str]:
        """Get a contextual response with a navigation-focused system prompt."""
        system_prompt = (
            "You are a helpful navigation assistant. Provide clear, concise, and friendly responses.\n"
            "Keep your answers brief and conversational, suitable for voice interaction."
        )
        full_prompt = f"{system_prompt}\n\n"
        if context:
            full_prompt += f"Context: {context}\n\n"
        full_prompt += f"User: {user_message}\nAssistant:"
        return self.get_response(full_prompt, model=model)

    def __enter__(self) -> SnowflakeLLMClient:
        self._connect()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()
