import snowflake.connector
from config import ACCOUNT, USER, PASSWORD  # add PASSWORD in config

conn = snowflake.connector.connect(
    user=USER,
    password=PASSWORD,
    account=ACCOUNT
)

cur = conn.cursor()

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