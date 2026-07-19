import requests, json

url = "http://localhost:5173/api/General/GeneralAPI/"
headers = { "Content-Type": "application/json", "SP_Name": "APIPlusJournalOperation" }
body = {
  "Operation": "Run Query",
  "AppVersionWeb": "225",
  "PlatForm": "web"
}
# We don't have "Run Query" in APIPlusJournalOperation.
