async function run() {
    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const url = "https://sila.silasystem.com:7103/General/GeneralAPI/";
        const headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "SP_Name": "APIPlusJournalOperation"
        };
        const body = {
            "Operation": "Get Database Tables",
            "AppVersionWeb": "225",
            "PlatForm": "web"
        };
        const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
        const text = await res.text();
        console.log("Raw response:", text.substring(0, 500));
    } catch (e) {
        console.error(e);
    }
}
run();
