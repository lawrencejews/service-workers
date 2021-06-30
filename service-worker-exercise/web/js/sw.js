"use strict";

const version = 4;
var isOnline = true;
var isLoggedIn = false;
var cacheName = `rambling-${version}`;

//Caching
var urlsToCache = {
    loggegOut: [
        "/",
        "/about",
        "/contact",
        "/404",
        "/login",
        "offline",
        "/css/style.css",
        "/js/blog.js",
        "/js/home.js",
        "/js/login.js",
        "/js/add-post.js",
        "/images/logo.gif",
        "/images/offline.png"
    ]
}

//Listerning
self.addEventListener("install", onInstall);
self.addEventListener("activate", onActivate);
self.addEventListener("message", onMessage);
self.addEventListener("fetch", onFetch);

//Error catching
main().catch(console.error);

async function main() {
    console.log(`Service Worker (${version}) is starting...`);
    await sendMessage({ requestStatusUpdate: true });
    await cacheLoggedOutFiles();

}

async function onInstall(evt) {
    console.log(`Service Worker (${version}) installed.`);
    self.skipWaiting();
}

// status change for clients 
async function sendMessage(msg) {
    var allClients = await clients.matchAll({ includeUncontrolled: true });
    return Promise.all(
        allClients.map(function clientMsg(client) {
            var chan = new MessageChannel();
            chan.port1.onmessage = onMessage;
            return client.postMessage(msg, [chan.port2]);
        })
    )
}

function onMessage({ data }) {
    if (data.statusUpdate) {
        ({ isOnline, isLoggedIn } = data.statusUpdate);
        console.log(`Service Worker(v${version}) status update, isOnline: ${isOnline}, isLoggedIn: ${isLoggedIn}`);
    }
}

//Fetching service worker routing
function onFetch(evt) {
    evt.respondWith(router(evt.request))
}

async function router(req) {
    var url = new URL(req.url);
    var reqURL = url.pathname;
    var cache = await caches.open(cacheName);

    if (url.origin == location.origin) {
        let res;
        try {
            
            let fetchOptions = {
                method: req.method,
                headers: req.headers,
                credentials: "omit",
                cache: "no-store"
            };
            let res = await fetch(req.url, fetchOptions);
            if (res && res.ok) {
                await cache.put(reqURL, res.clone());
                return res;
            }
        }
        catch (err) { }
        
        res = await cache.match(reqURL);
        if (res) {
            return res.clone();
        }
    }
    //TODO: figure out CORS requests
}

// Active a service worker
function onActivate(evt) {
    evt.waitUntil(handleActivation());
}

async function handleActivation() {
    await clearCaches();
    await cacheLoggedOutFiles(/*forceReload=*/ true);
    await clients.claim();
    console.log(`Service Worker (${version}) activated`);
}

//Clearing caching function
async function clearCaches() {
    var cacheNames = await caches.keys();
    var oldCacheNames = cacheName.filter(function matcheOldCache(cacheName) {
        if (/^ramblings-\d+$/.test(cacheName)) {
            let [, cacheVersion] = cacheName.match(/^ramblings-\d+$/);
            cacheVersion = (cacheVersion != null) ? Number(cacheVersion) : cacheVersion;
            return (cacheVersion > 0 && cacheVersion != version);
       } 
    });
    return Promise.all(
        oldCacheNames.map(function deleteCache(cacheName) {
            return caches.delete(cacheName);
        })
    )
}

//Caching function 
async function cacheLoggedOutFiles(forceReload = false) {
    var cache = await caches.match(cacheName);

    return Promise.all(
        urlsToCache.loggegOut.map(async function requestFile(url) {
            try {
                let res;
                if(!forceReload){
                    res = await cache.match(url);
                    if (res) {
                        return res;
                    }
                }

                // fetch Ajax
                let fetchOptions = {
                    method: "GET",
                    cache: "no-cache",
                    Credential: "omit"
                };

                res = await fetch(url, fetchOptions);
                if (res.ok) {
                    await cache.put(url, res.clone());
                }
            } catch (err) {
                
            }
        })
    )
}