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
    'mistral-7b',
    'Who was the first president of the United States'
) AS response;
"""

cur.execute(query)
row = cur.fetchone()
print(row[0])

cur.close()
conn.close()