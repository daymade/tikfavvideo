// ==UserScript==
// @name         抖音收藏夹内容复制
// @namespace    http://tampermonkey.net/
// @version      0.1.9
// @description  用来将抖音收藏夹中视频的id name复制到剪切板中
// @author       You
// @match        https://www.douyin.com/*
// @icon         https://www.google.com/s2/favicons?domain=bilibili.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    document.body.addEventListener('keydown', function (e) {
        if (e.shiftKey && e.code == 'KeyS') {
            e.preventDefault();

            let output = '';
            document.querySelectorAll('.h0CXDpkg').forEach(x => {
                const href = x.href;
                const alt = x.querySelector('img') ? x.querySelector('img').alt : '';
                output += `${href} ${alt}\n`;
            });
            fetch('http://100.114.25.144:8000/convertAll', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videos: [
                        { url: 'https://www.example.com/video1', title: 'Video 1 Title' },
                        { url: 'https://www.example.com/video2', title: 'Video 2 Title' }
                        // 更多视频
                    ]
                })
            })
            .then(response => response.text())
            .then(html => {
                document.documentElement.innerHTML = html;
            })
            .catch(error => console.error('Error:', error));
        //     使用现代的 navigator.clipboard API
        //    navigator.clipboard.writeText(output).then(() => {
        //        alert('内容已复制到剪切板');
        //    }).catch(err => {
        //        console.error('复制到剪切板失败:', err);
        //    });
        }
    });
})();