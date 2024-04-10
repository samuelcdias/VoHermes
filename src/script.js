function sendMessage(msg) {
    //send some structured-cloneable data from the webpage to the sw
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(msg);
    }
}
async function getStorageSize() {
    if ("storage" in navigator) {
        if ("estimate" in navigator.storage) {
            const { usage, quota } = await navigator.storage.estimate()
            let usedKB = parseInt(usage/1024);
            let quotaKB = parseInt(quota/1024);
            return { usage: usedKB, quota: quotaKB };
        }
    }
    return { usage: 0, quota: 0 };
}
function onMessage({ data }) {
    //got a message from the service worker
    console.log('Web page receiving', data);
}
getStorageSize().then(({ usage, quota }) => {
    console.log('sending quota', usage, quota);
    sendMessage({storage: { usage, quota }});
});
