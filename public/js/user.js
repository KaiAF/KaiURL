fetch('/api/auth/account', {
    method: "get"
}).then(async (b) => {
    if (b.statusText === "OK") {
        console.log(await b.json());
    };
});