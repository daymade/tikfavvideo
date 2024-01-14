// ==UserScript==
// @name         抖音收藏夹导出
// @namespace    http://tampermonkey.net/
// @version      0.3.0
// @description  导出抖音收藏夹的视频url等信息
// @author       Cyrus
// @match        https://www.douyin.com/*
// @icon         https://www.google.com/s2/favicons?domain=douyin.com
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // 检查是否在收藏夹页面
    function isInFavoritesPage() {
        return window.location.href.includes('user/self?showTab=favorite_collection');
    }

    // 提示并跳转到收藏夹页面
    function redirectToFavorites() {
        alert('在收藏夹页面才能正常导出视频，请手动打开一个收藏夹再点击导出');
        window.location.href = 'https://www.douyin.com/user/self?showTab=favorite_collection';
    }

    // 主要逻辑
    function main() {
        function generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        function extractVideoId(url) {
            var match = url.match(/video\/(\d+)/);
            return match ? match[1] : null;
        }

        function cleanVideoUrl(url) {
            var match = url.match(/(https:\/\/www\.douyin\.com\/video\/\d+)/);
            return match ? match[1] : null;
        }

        let collectionNameElement = document.querySelector(`.l6JWwE5E`)?.querySelector(".V4HG8DSl>div>p");
        if (!collectionNameElement) {
            redirectToFavorites();
            return;
        }

        let collectionCount = parseInt(document.querySelector(`.l6JWwE5E`)?.querySelector(".DphUWwVP>span").textContent, 10);

        let convert = {
            turn: generateUUID(),
            collection: {
                name: collectionNameElement.textContent,
                count: collectionCount,
                user: {
                    nick: document.querySelector('.mZmVWLzR h1').textContent,
                    id: document.querySelector('.mZmVWLzR .TVGQz3SI').textContent.split('：')[1]
                }
            },
            exportTime: new Date().toISOString(),
            videos: []
        };

        document.querySelectorAll(`.h0CXDpkg`).forEach(x => {
            let video = {
                id: extractVideoId(x.href),
                url: cleanVideoUrl(x.href),
                name: x.querySelector('img').alt,
                cover: x.querySelector('img').src,
                likes: x.querySelector('.author-card-user-video-like>span').textContent
            };
            convert.videos.push(video);
        });

        console.log(JSON.stringify(convert));

        // 复制到剪切板
        navigator.clipboard.writeText(JSON.stringify(convert)).then(() => {
            if (convert.videos.length < convert.collection.count){
                alert(`收藏夹 ${convert.collection.name} 的前 ${convert.videos.length} 个视频已复制到剪切板，你可以向下滚动页面，加载更多视频后再次导出`);
            } else {
                alert(`收藏夹 ${convert.collection.name} 的 ${convert.videos.length} 个视频已复制到剪切板`);
            }
        }).catch(err => {
            alert('复制到剪切板失败:', err);
        });
    }

    document.body.addEventListener('keydown', function (e) {
        if (e.shiftKey && e.code == 'KeyS') {
            e.preventDefault();
            if (isInFavoritesPage()) {
                main();
            } else {
                redirectToFavorites();
            }
        }
    });
})();
