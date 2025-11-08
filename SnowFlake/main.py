from config import ACCOUNT, USER, REGION
import snowflake.connector
import os

private_key = """-----BEGIN RSA PRIVATE KEY-----
MIIBOgIBAAJBALb7zVt9vE2h5rGnJ1xZqz9oQe3PjFZq3gZr9L3+EwO4Y8h8c8fA
kQIDAQABAkEAkP5wG6V0Zt6cJqxXxZ+9wKgq1p8F4+bbt8W1ShAq0a9t1g1e3yF5
iV8V2jZ9U9Bb2FhL8l6M5pQIDAQAB
-----END RSA PRIVATE KEY-----
"""

# Establish connection
conn = snowflake.connector.connect(
    user=USER,
    account=ACCOUNT,
    region=REGION,
    private_key=private_key
)

# Create a cursor
cur = conn.cursor()

# Example: Call Claude 3.5 Sonnet via Snowflake Cortex
query = """
SELECT SNOWFLAKE.CORTEX.COMPLETE(
    'claude-3-5-sonnet',
    'How are you doing today?'
) AS response;
"""

cur.execute(query)
row = cur.fetchone()
print("Claude response:", row[0])

cur.close()
conn.close()