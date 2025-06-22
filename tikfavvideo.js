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

    // 检查页面状态
    function getPageStatus() {
        const url = window.location.href;
        console.log('当前URL:', url);
        
        if (!url.includes('user/self') || !url.includes('favorite')) {
            return { status: 'not_favorites', message: '不在收藏夹页面' };
        }
        
        // 检查是否在具体收藏夹内 - 更精确的判断
        console.log('=== 开始页面状态检测 ===');
        
        // 1. 优先检查URL参数：如果有folderId参数，说明在具体收藏夹内
        const urlParams = new URLSearchParams(window.location.search);
        const folderId = urlParams.get('folderId');
        console.log('URL中的folderId:', folderId);
        
        if (folderId) {
            console.log('通过URL参数确定：在具体收藏夹内');
            return { status: 'in_collection', message: '在具体收藏夹内' };
        }
        
        // 2. 检查收藏夹项目特征（在scroll-list中查找收藏夹项）- 优先使用此方法
        const scrollList = document.querySelector('[data-e2e="scroll-list"]');
        console.log('是否有scroll-list:', !!scrollList);
        
        let folderItems = [];
        if (scrollList) {
            // 查找收藏夹项目：<p class="EaKKT0f5">数字</p> 格式的收藏夹名称
            const folderNameElements = scrollList.querySelectorAll('p.EaKKT0f5');
            console.log('找到收藏夹名称元素数量:', folderNameElements.length);
            
            for (let element of folderNameElements) {
                const folderName = element.textContent.trim();
                if (folderName.match(/^\\d+$/)) {
                    // 查找对应的作品数量（"共X作品"模式）
                    let container = element;
                    for (let i = 0; i < 5; i++) {
                        container = container.parentElement;
                        if (!container) break;
                        
                        const workCountElement = container.querySelector('.Z9WVloV6');
                        if (workCountElement && workCountElement.textContent.includes('共') && workCountElement.textContent.includes('作品')) {
                            const countMatch = workCountElement.textContent.match(/共(\\d+)作品/);
                            if (countMatch) {
                                folderItems.push({
                                    name: folderName,
                                    count: countMatch[1]
                                });
                                console.log(`找到收藏夹项目: ${folderName} - ${countMatch[1]}作品`);
                            }
                            break;
                        }
                    }
                }
            }
        }
        
        console.log('找到收藏夹项目数量:', folderItems.length);
        
        // 3. 检查是否有视频链接
        const videoLinks = document.querySelectorAll('a[href*="/video/"]');
        console.log('找到视频链接数量:', videoLinks.length);
        
        // 4. 检查新建收藏夹按钮（收藏夹列表页特有）
        const hasNewFolderButton = [...document.querySelectorAll('*')].some(el => 
            el.textContent && el.textContent.trim() === '新建收藏夹'
        );
        console.log('是否有新建收藏夹按钮:', hasNewFolderButton);
        
        // 5. 最终判断逻辑（按优先级排序）
        if (folderItems.length >= 1) {
            // 如果找到收藏夹项目，说明在收藏夹列表页面
            console.log('通过收藏夹项目确定：在收藏夹列表页面');
            return { status: 'collection_list', message: '在收藏夹列表页面' };
        } else if (videoLinks.length > 5) {
            // 如果没有收藏夹项目但有大量视频链接，说明在具体收藏夹内
            console.log('通过视频内容确定：在具体收藏夹内');
            return { status: 'in_collection', message: '在具体收藏夹内' };
        } else if (hasNewFolderButton) {
            // 有新建收藏夹按钮但没有收藏夹项目，可能是空的收藏夹列表
            console.log('通过新建收藏夹按钮确定：在收藏夹列表页面');
            return { status: 'collection_list', message: '在收藏夹列表页面' };
        } else {
            console.log('无法确定状态，返回空收藏夹');
            return { status: 'empty_collection', message: '收藏夹为空或页面未加载完成' };
        }
    }

    // 显示收藏夹列表，提示用户选择
    function showCollectionList() {
        // 查找页面上所有的收藏夹
        const collectionElements = [];
        
        // 使用与状态检测相同的逻辑查找收藏夹项目
        const scrollList = document.querySelector('[data-e2e="scroll-list"]');
        if (scrollList) {
            // 查找收藏夹项目：<p class="EaKKT0f5">数字</p> 格式的收藏夹名称
            const folderNameElements = scrollList.querySelectorAll('p.EaKKT0f5');
            
            for (let element of folderNameElements) {
                const folderName = element.textContent.trim();
                if (folderName.match(/^\d+$/)) {
                    // 查找对应的作品数量（"共X作品"模式）
                    let container = element;
                    for (let i = 0; i < 5; i++) {
                        container = container.parentElement;
                        if (!container) break;
                        
                        const workCountElement = container.querySelector('.Z9WVloV6');
                        if (workCountElement && workCountElement.textContent.includes('共') && workCountElement.textContent.includes('作品')) {
                            const countMatch = workCountElement.textContent.match(/共(\d+)作品/);
                            if (countMatch) {
                                collectionElements.push({
                                    name: folderName,
                                    count: countMatch[1]
                                });
                            }
                            break;
                        }
                    }
                }
            }
        }
        
        if (collectionElements.length > 0) {
            let message = '📁 您当前在收藏夹列表页面，发现以下收藏夹：\n\n';
            collectionElements.forEach(collection => {
                message += `📂 收藏夹 "${collection.name}" - ${collection.count}个视频\n`;
            });
            message += '\n💡 操作说明：\n';
            message += '1. 点击任意收藏夹进入具体收藏夹页面\n';
            message += '2. 等待页面加载完成，确认显示视频列表\n';
            message += '3. 再次按 Shift+S 导出该收藏夹的视频数据\n\n';
            message += '⚠️ 注意：必须进入具体收藏夹才能导出数据';
            alert(message);
        } else {
            alert('❌ 未找到任何收藏夹\n\n可能的原因：\n1. 页面还在加载中\n2. 当前页面不是收藏夹列表页面\n3. 您的收藏夹为空\n\n请刷新页面后重试');
        }
    }

    // 主要逻辑
    async function main() {
        console.log('🚀 main()函数开始执行');
        console.log('📍 当前页面URL:', window.location.href);
        
        // 首先检查页面状态
        const pageStatus = getPageStatus();
        console.log('📊 页面状态检测结果:', pageStatus);
        
        if (pageStatus.status === 'not_favorites') {
            alert('❌ 请先进入收藏夹页面\n\n点击确定将跳转到收藏夹页面');
            window.location.href = 'https://www.douyin.com/user/self?showSubTab=favorite_folder&showTab=favorite_collection';
            return;
        }
        
        if (pageStatus.status === 'collection_list') {
            showCollectionList();
            return;
        }
        
        if (pageStatus.status === 'empty_collection') {
            alert('❌ 收藏夹为空或页面未加载完成\\n\\n请确认：\\n1. 当前收藏夹中有视频内容\\n2. 页面已完全加载\\n3. 您已进入具体的收藏夹而不是收藏夹列表页面');
            return;
        }
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

        // 检查是否选择了具体的收藏夹（通过检查是否有视频内容或收藏夹信息）
        console.log('开始检查页面状态...');
        
        // 等待页面加载完成
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 自动滚动加载更多视频
        console.log('开始自动滚动加载更多视频...');
        let previousVideoCount = 0;
        let currentVideoCount = 0;
        let scrollAttempts = 0;
        let noChangeAttempts = 0;
        const maxScrollAttempts = 20; // 增加最大滚动次数
        const maxNoChangeAttempts = 3; // 允许连续3次没有变化才停止
        
        // 使用更准确的视频计数方法
        function countVideos() {
            // 优先使用我们后面会用到的精确选择器
            const containers = [
                document.querySelector('[data-e2e="scroll-list"]'),
                document.querySelector('ul'),
                ...Array.from(document.querySelectorAll('div')).filter(div => {
                    const videoLinks = div.querySelectorAll('a[href*="/video/"]');
                    return videoLinks.length >= 5;
                })
            ].filter(el => el);
            
            if (containers.length > 0) {
                return containers[0].querySelectorAll('a[href*="/video/"]').length;
            } else {
                return Array.from(document.querySelectorAll('a[href*="/video/"]')).filter(link => {
                    return link.querySelector('img') && link.closest('li, div[class]');
                }).length;
            }
        }
        
        // 检查是否到达底部的函数
        function isAtBottom() {
            return document.body.textContent.includes('暂时没有更多') || 
                   document.body.textContent.includes('没有更多了') ||
                   document.body.textContent.includes('已经到底了') ||
                   document.body.textContent.includes('没有更多内容');
        }
        
        currentVideoCount = countVideos();
        console.log(`初始视频数量: ${currentVideoCount}`);
        
        // 改进的滚动逻辑
        while (scrollAttempts < maxScrollAttempts && noChangeAttempts < maxNoChangeAttempts) {
            previousVideoCount = currentVideoCount;
            
            // 滚动到页面底部
            window.scrollTo(0, document.body.scrollHeight);
            console.log(`滚动次数: ${scrollAttempts + 1}, 当前视频数: ${currentVideoCount}`);
            
            // 等待新内容加载，给更多时间
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            currentVideoCount = countVideos();
            scrollAttempts++;
            
            // 检查视频数量是否有变化
            if (currentVideoCount === previousVideoCount) {
                noChangeAttempts++;
                console.log(`视频数量未变化，连续无变化次数: ${noChangeAttempts}/${maxNoChangeAttempts}`);
            } else {
                noChangeAttempts = 0; // 有变化则重置计数器
                console.log(`视频数量增加: ${previousVideoCount} -> ${currentVideoCount}`);
            }
            
            // 检查是否已经到底
            if (isAtBottom()) {
                console.log('检测到"暂时没有更多"等文本，已到达页面底部，停止滚动');
                break;
            }
            
            // 额外的滚动策略：如果连续没有变化但还没到底，再尝试滚动几次
            if (noChangeAttempts >= 2 && !isAtBottom()) {
                console.log('尝试更积极的滚动策略...');
                // 滚动到更下面一点
                window.scrollTo(0, document.body.scrollHeight + 1000);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        console.log(`滚动完成！最终视频数: ${currentVideoCount}, 总滚动次数: ${scrollAttempts}`);
        
        // 尝试找到当前选中的收藏夹信息
        let collectionNameElement = null;
        let collectionCount = 0;
        
        // 查找当前激活的收藏夹名称 - 完全不依赖随机类名
        let collectionName = '当前收藏夹';
        
        console.log('=== 调试收藏夹名称查找（无随机类名版本）===');
        
        // 方法1: 通过data-tip属性定位新建收藏夹，然后分析周围结构
        const newFolderElement = [...document.querySelectorAll('[data-tip="新建收藏夹"]')];
        
        if (newFolderElement.length > 0) {
            console.log('找到新建收藏夹按钮:', newFolderElement.length);
            
            // 从新建收藏夹按钮向上查找容器
            let container = newFolderElement[0];
            for (let i = 0; i < 5; i++) {
                container = container.parentElement;
                if (!container) break;
                
                // 在容器中查找所有data-tip属性
                const allDataTips = container.querySelectorAll('[data-tip]');
                console.log(`层级${i+1}容器中找到${allDataTips.length}个data-tip元素`);
                
                // 分析每个data-tip，寻找数字收藏夹名称
                const folderCandidates = [];
                for (let element of allDataTips) {
                    const tip = element.getAttribute('data-tip');
                    if (tip && tip.match(/^\d+$/)) {
                        // 检查这个元素的父级是否看起来像收藏夹项
                        let folderElement = element;
                        while (folderElement && folderElement !== container) {
                            // 查找包含视频数量的span元素
                            const countSpans = folderElement.querySelectorAll('span');
                            let videoCount = null;
                            
                            for (let span of countSpans) {
                                const spanText = span.textContent.trim();
                                if (spanText.match(/^\d+$/) && spanText !== tip) {
                                    videoCount = spanText;
                                    break;
                                }
                            }
                            
                            if (videoCount) {
                                folderCandidates.push({
                                    name: tip,
                                    count: videoCount,
                                    element: folderElement,
                                    tipElement: element
                                });
                                break;
                            }
                            folderElement = folderElement.parentElement;
                        }
                    }
                }
                
                console.log('找到收藏夹候选:', folderCandidates);
                
                if (folderCandidates.length > 0) {
                    // 寻找当前激活的收藏夹（通过各种方式判断）
                    let activeFolder = null;
                    
                    // 方式1: 查找有特殊背景图片的（从HTML看激活的有img标签）
                    for (let candidate of folderCandidates) {
                        const hasImage = candidate.element.querySelector('img');
                        if (hasImage) {
                            activeFolder = candidate;
                            console.log('通过img标签找到激活收藏夹:', candidate.name);
                            break;
                        }
                    }
                    
                    // 方式2: 查找有锁图标的（从HTML看123有锁图标）
                    if (!activeFolder) {
                        for (let candidate of folderCandidates) {
                            const svgElements = candidate.element.querySelectorAll('svg');
                            for (let svg of svgElements) {
                                const pathElements = svg.querySelectorAll('path');
                                for (let path of pathElements) {
                                    if (path.getAttribute('d') && 
                                        path.getAttribute('d').includes('V7C7 4.23858') || // 锁的特征路径
                                        path.getAttribute('d').includes('V9H15V7Z')) {
                                        activeFolder = candidate;
                                        console.log('通过锁图标找到激活收藏夹:', candidate.name);
                                        break;
                                    }
                                }
                                if (activeFolder) break;
                            }
                            if (activeFolder) break;
                        }
                    }
                    
                    // 方式3: 通过视频数量判断（选择非0的）
                    if (!activeFolder) {
                        for (let candidate of folderCandidates) {
                            if (candidate.count !== '0') {
                                activeFolder = candidate;
                                console.log('通过非0视频数量找到激活收藏夹:', candidate.name);
                                break;
                            }
                        }
                    }
                    
                    // 方式4: 选择第一个找到的
                    if (!activeFolder && folderCandidates.length > 0) {
                        activeFolder = folderCandidates[0];
                        console.log('使用第一个候选作为激活收藏夹:', activeFolder.name);
                    }
                    
                    if (activeFolder) {
                        collectionName = activeFolder.name;
                        console.log('最终确定收藏夹名称:', collectionName);
                        break;
                    }
                }
            }
        }
        
        // 方法2: 通过URL参数获取收藏夹信息
        if (collectionName === '当前收藏夹') {
            const urlParams = new URLSearchParams(window.location.search);
            const folderId = urlParams.get('folderId');
            if (folderId && folderId.match(/^\d+$/)) {
                console.log('从URL参数找到收藏夹ID:', folderId);
                collectionName = folderId;
            }
        }
        
        // 方法3: 通过页面中的数字元素分析
        if (collectionName === '当前收藏夹') {
            console.log('使用页面数字元素分析方法...');
            
            // 查找页面中所有纯数字的data-tip元素
            const allDataTips = document.querySelectorAll('[data-tip]');
            const numberTips = [];
            
            for (let element of allDataTips) {
                const tip = element.getAttribute('data-tip');
                if (tip && tip.match(/^\d+$/) && tip !== '0') {
                    // 检查周围是否有视频数量信息
                    let container = element;
                    for (let level = 0; level < 3; level++) {
                        container = container.parentElement;
                        if (!container) break;
                        
                        const spans = container.querySelectorAll('span');
                        for (let span of spans) {
                            const spanText = span.textContent.trim();
                            if (spanText.match(/^\d+$/) && spanText !== tip) {
                                numberTips.push({
                                    name: tip,
                                    count: spanText,
                                    element: element
                                });
                                break;
                            }
                        }
                        if (numberTips.some(item => item.name === tip)) break;
                    }
                }
            }
            
            console.log('找到数字收藏夹:', numberTips);
            
            if (numberTips.length > 0) {
                // 优先选择有较多视频的收藏夹
                const nonEmptyFolders = numberTips.filter(item => item.count !== '0');
                if (nonEmptyFolders.length > 0) {
                    collectionName = nonEmptyFolders[0].name;
                    console.log('选择非空收藏夹:', collectionName);
                } else {
                    collectionName = numberTips[0].name;
                    console.log('选择第一个收藏夹:', collectionName);
                }
            }
        }
        
        
        collectionNameElement = { textContent: collectionName };
        console.log('最终收藏夹名称:', collectionName);

        // 尝试获取收藏夹数量 - 更精确的视频选择器
        // 首先查找收藏夹视频列表容器
        let videoElements = [];
        
        // 方法1: 查找收藏夹视频列表的特定容器（不依赖随机类名）
        const videoListContainers = [
            document.querySelector('[data-e2e="scroll-list"]'), // 滚动列表（语义化属性）
            document.querySelector('ul'), // 通常视频列表是ul元素
            document.querySelector('div > ul'), // 或者在div内的ul
            ...Array.from(document.querySelectorAll('div')).filter(div => {
                // 查找包含多个video链接的div容器
                const videoLinks = div.querySelectorAll('a[href*="/video/"]');
                return videoLinks.length >= 5; // 至少有5个视频链接的容器
            })
        ].filter(el => el);
        
        if (videoListContainers.length > 0) {
            // 在视频列表容器中查找视频链接
            videoElements = videoListContainers[0].querySelectorAll('a[href*="/video/"]');
            console.log('从视频列表容器中找到视频:', videoElements.length);
        } else {
            // 降级方案：查找所有视频链接，但过滤掉明显不属于收藏夹的
            const allVideoLinks = document.querySelectorAll('a[href*="/video/"]');
            console.log('找到所有视频链接:', allVideoLinks.length);
            
            // 过滤条件：视频必须有img子元素且有合适的父容器结构
            videoElements = Array.from(allVideoLinks).filter(link => {
                // 必须有图片
                const hasImage = link.querySelector('img');
                if (!hasImage) return false;
                
                // 检查父容器是否看起来像视频项
                let container = link;
                for (let i = 0; i < 3; i++) {
                    container = container.parentElement;
                    if (!container) break;
                    
                    // 如果容器有视频相关的类名或结构特征
                    if (container.tagName === 'LI' || 
                        container.querySelector('[class*="like"]') ||
                        container.querySelector('span')) {
                        return true;
                    }
                }
                return false;
            });
            console.log('过滤后的视频链接:', videoElements.length);
        }
        
        collectionCount = videoElements.length;
        
        // 验证是否找到了视频
        if (collectionCount === 0) {
            alert('❌ 没有找到任何视频！\n\n可能的原因：\n' +
                  '1. 当前收藏夹为空\n' +
                  '2. 页面还在加载中，请等待后重试\n' +
                  '3. 请确认已进入具体的收藏夹而不是收藏夹列表页面\n\n' +
                  '请检查页面状态后重新尝试');
            return;
        }
        
        console.log(`✅ 成功找到 ${collectionCount} 个视频`);
        
        // 获取用户信息
        const userNick = document.querySelector('h1.hSGGwDAt')?.textContent || '未知用户';
        const userIdElement = document.querySelector('[class*="抖音号"]') || 
                             document.querySelector('[data-e2e="user-unique-id"]');
        const userId = userIdElement?.textContent?.replace('抖音号：', '') || '未知';

        const convert = {
            turn: generateUUID(),
            collection: {
                name: collectionNameElement.textContent,
                count: collectionCount,
                user: {
                    nick: userNick,
                    id: userId
                }
            },
            exportTime: new Date().toISOString(),
            videos: []
        };

        // 使用新的选择器提取视频信息
        videoElements.forEach((videoElement, index) => {
            try {
                const videoId = extractVideoId(videoElement.href);
                const videoUrl = cleanVideoUrl(videoElement.href);
                const videoName = videoElement.querySelector('img')?.alt || '';
                const videoCover = videoElement.querySelector('img')?.src || '';
                
                // 验证视频数据的完整性
                if (!videoId || !videoUrl || !videoName || videoName === '无标题') {
                    console.log('跳过无效视频:', {
                        id: videoId,
                        url: videoUrl,
                        name: videoName,
                        href: videoElement.href
                    });
                    return; // 跳过这个无效视频
                }
                
                const video = {
                    id: videoId,
                    url: videoUrl,
                    name: videoName,
                    cover: videoCover,
                    likes: ''
                };
                
                // 提取点赞数信息
                
                // 尝试获取点赞数等统计信息
                const possibleStats = [
                    videoElement.querySelector('[class*="like"]'),
                    videoElement.querySelector('[class*="count"]'),
                    videoElement.querySelector('[class*="stat"]'),
                    ...videoElement.querySelectorAll('span')
                ].filter(el => el && el.textContent && /\d/.test(el.textContent));
                
                if (possibleStats.length > 0) {
                    // 优先选择包含数字且可能是点赞数的元素
                    const likeElement = possibleStats.find(el => 
                        el.textContent.match(/\d+\.?\d*[万千kmw]?/) && 
                        !el.textContent.includes('秒') && 
                        !el.textContent.includes('分钟')
                    ) || possibleStats[0];
                    
                    video.likes = likeElement.textContent.trim();
                }
                
                convert.videos.push(video);
            } catch (error) {
                console.error('提取视频信息失败:', error);
            }
        });

        console.log(JSON.stringify(convert));

        // 检查是否需要加载更多内容
        const hasMoreButton = document.querySelector('[class*="more"], [class*="load"]');
        const noMoreText = document.querySelector('[class*="nomore"], [class*="结束"]');
        const noMoreFound = isAtBottom(); // 使用相同的检测函数
        
        // 改进加载完成判断：基于实际滚动结果和页面状态
        const reachedEnd = noMoreFound || noChangeAttempts >= maxNoChangeAttempts;
        const needLoadMore = !reachedEnd && hasMoreButton;
        
        console.log('加载状态检查:', {
            noMoreFound,
            noChangeAttempts,
            maxNoChangeAttempts,
            reachedEnd,
            needLoadMore,
            hasMoreButton: !!hasMoreButton
        });
        
        // 格式化输出为结构化的表格数据
        const csvData = convert.videos.map((video, index) => ({
            序号: index + 1,
            视频ID: video.id,
            标题: video.name,
            链接: video.url,
            封面: video.cover,
            点赞数: video.likes || '未获取'
        }));
        
        // 创建小白友好的URL列表
        const simpleUrlList = convert.videos.map(video => video.url).join(',\n');
        
        // 创建完整的导出数据
        const exportData = {
            收藏夹信息: {
                名称: convert.collection.name,
                视频总数: convert.videos.length,
                用户昵称: convert.collection.user.nick,
                用户ID: convert.collection.user.id,
                导出时间: new Date().toLocaleString('zh-CN')
            },
            视频列表: csvData,
            简化URL列表: {
                说明: "以下是纯URL列表，适合复制到在线工具使用",
                格式: "逗号+换行分隔",
                链接: simpleUrlList
            }
        };
        
        // 复制到剪切板
        const exportText = JSON.stringify(exportData, null, 2);
        navigator.clipboard.writeText(exportText).then(() => {
            if (needLoadMore) {
                alert(`⚠️ 可能未加载完整！
当前已导出 ${convert.videos.length} 个视频
请向下滚动加载更多视频，直到页面显示"暂时没有更多了"，然后重新运行脚本。
数据已复制到剪切板（结构化JSON格式）`);
            } else {
                alert(`✅ 导出完成！
收藏夹"${convert.collection.name}"的 ${convert.videos.length} 个视频已复制到剪切板

📊 数据格式：结构化JSON，包含：
• 完整的视频信息表格
• 简化URL列表（适合小白用户复制到在线工具使用）

💡 使用提示：
• 技术用户：使用"视频列表"部分的详细数据
• 小白用户：复制"简化URL列表"中的链接到在线下载工具`);
            }
        }).catch(err => {
            alert('❌ 复制到剪切板失败: ' + err);
        });
    }

    // 添加调试信息
    console.log('🚀 TikTok收藏夹导出脚本已加载');
    console.log('📖 使用说明：按 Shift+S 触发导出');
    
    document.body.addEventListener('keydown', function (e) {
        console.log('⌨️ 按键检测:', {
            key: e.key,
            code: e.code,
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey
        });
        
        if (e.shiftKey && e.code == 'KeyS') {
            console.log('✅ 触发导出快捷键 Shift+S');
            e.preventDefault();
            
            // 添加执行提示
            console.log('🔄 开始执行导出...');
            main().catch(err => {
                console.error('❌ 导出过程出错:', err);
                alert('❌ 导出失败：' + err.message);
            });
        } else if (e.shiftKey || e.code === 'KeyS') {
            console.log('⚠️ 按键组合不正确，需要同时按 Shift+S');
        }
    });
})();
