// 数据抓取逻辑
// 从抖音页面提取达人信息和作品列表

class Scraper {
  constructor() {
    this.isCollecting = false;
  }

  // 提取达人基本信息
  extractCreatorInfo() {
    try {
      const creatorData = {
        user_id: '',
        username: '',
        avatar_url: '',
        bio: '',
        follower_count: 0,
        following_count: 0,
        like_count: 0,
        video_count: 0
      };

      // 方法1: 从页面DOM提取
      // 尝试从用户主页提取信息
      const usernameEl = document.querySelector('[data-e2e="user-title"]') || 
                         document.querySelector('.user-title') ||
                         document.querySelector('h1[class*="username"]');
      if (usernameEl) {
        creatorData.username = usernameEl.textContent.trim();
      }

      // 提取用户ID（从URL或页面数据中）
      const urlMatch = window.location.pathname.match(/\/user\/([^/?]+)/);
      if (urlMatch) {
        creatorData.user_id = urlMatch[1];
      } else {
        // 尝试从页面数据中提取
        const pageData = this.extractPageData();
        if (pageData && pageData.userInfo) {
          creatorData.user_id = pageData.userInfo.uid || pageData.userInfo.userId || '';
          creatorData.username = creatorData.username || pageData.userInfo.nickname || '';
          creatorData.avatar_url = pageData.userInfo.avatar || '';
          creatorData.bio = pageData.userInfo.signature || '';
          creatorData.follower_count = pageData.userInfo.followerCount || 0;
          creatorData.following_count = pageData.userInfo.followingCount || 0;
          creatorData.like_count = pageData.userInfo.totalFavorited || 0;
          creatorData.video_count = pageData.userInfo.awemeCount || 0;
        }
      }

      // 从DOM提取统计数据
      const statsElements = document.querySelectorAll('[data-e2e="user-fans"], [data-e2e="user-follow"], [data-e2e="user-like"]');
      statsElements.forEach(el => {
        const text = el.textContent.trim();
        const num = this.parseNumber(text);
        if (text.includes('粉丝') || text.includes('follower')) {
          creatorData.follower_count = num;
        } else if (text.includes('关注') || text.includes('following')) {
          creatorData.following_count = num;
        } else if (text.includes('获赞') || text.includes('like')) {
          creatorData.like_count = num;
        }
      });

      // 提取头像
      const avatarEl = document.querySelector('[data-e2e="user-avatar"] img') ||
                       document.querySelector('.avatar img') ||
                       document.querySelector('img[class*="avatar"]');
      if (avatarEl) {
        creatorData.avatar_url = avatarEl.src || avatarEl.getAttribute('data-src') || '';
      }

      // 提取简介
      const bioEl = document.querySelector('[data-e2e="user-signature"]') ||
                    document.querySelector('.user-signature') ||
                    document.querySelector('[class*="signature"]');
      if (bioEl) {
        creatorData.bio = bioEl.textContent.trim();
      }

      // 提取作品数量
      const videoCountEl = document.querySelector('[data-e2e="user-post"]') ||
                          document.querySelector('[class*="video-count"]');
      if (videoCountEl) {
        creatorData.video_count = this.parseNumber(videoCountEl.textContent) || 0;
      }

      return creatorData;
    } catch (error) {
      console.error('提取达人信息失败:', error);
      return null;
    }
  }

  // 从页面脚本中提取数据（抖音通常将数据嵌入到script标签中）
  extractPageData() {
    try {
      // 查找包含用户数据的script标签
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const content = script.textContent;
        
        // 尝试匹配常见的抖音数据结构
        const patterns = [
          /window\._SSR_HYDRATED_DATA\s*=\s*({.+?});/,
          /window\.__INITIAL_STATE__\s*=\s*({.+?});/,
          /"userInfo":\s*({.+?})/,
          /"user":\s*({.+?})/
        ];

        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match) {
            try {
              const data = JSON.parse(match[1]);
              return this.findUserInfo(data);
            } catch (e) {
              // 继续尝试其他模式
            }
          }
        }
      }
      return null;
    } catch (error) {
      console.error('提取页面数据失败:', error);
      return null;
    }
  }

  // 递归查找用户信息
  findUserInfo(obj, depth = 0) {
    if (depth > 10) return null; // 防止无限递归
    
    if (typeof obj !== 'object' || obj === null) return null;

    if (obj.userInfo || obj.user) {
      return obj.userInfo || obj.user;
    }

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const result = this.findUserInfo(obj[key], depth + 1);
        if (result) return result;
      }
    }

    return null;
  }

  // 提取作品列表
  async extractVideos(limit = 50) {
    try {
      const videos = [];
      
      // 方法1: 从DOM提取可见的作品
      const videoElements = document.querySelectorAll('[data-e2e="user-post-item"], [class*="video-item"], [class*="aweme-item"]');
      
      for (const element of videoElements) {
        if (videos.length >= limit) break;

        const video = {
          video_id: '',
          title: '',
          cover_url: '',
          play_count: 0,
          like_count: 0,
          comment_count: 0,
          share_count: 0,
          created_at: null
        };

        // 提取视频ID
        const link = element.querySelector('a[href*="/video/"]');
        if (link) {
          const hrefMatch = link.href.match(/\/video\/(\d+)/);
          if (hrefMatch) {
            video.video_id = hrefMatch[1];
          }
        }

        // 提取标题
        const titleEl = element.querySelector('[data-e2e="user-post-item-desc"]') ||
                       element.querySelector('.video-title') ||
                       element.querySelector('[class*="title"]');
        if (titleEl) {
          video.title = titleEl.textContent.trim();
        }

        // 提取封面
        const coverEl = element.querySelector('img');
        if (coverEl) {
          video.cover_url = coverEl.src || coverEl.getAttribute('data-src') || '';
        }

        // 提取统计数据
        const stats = element.querySelectorAll('[class*="count"], [class*="stat"]');
        stats.forEach(stat => {
          const text = stat.textContent.trim();
          const num = this.parseNumber(text);
          if (text.includes('播放') || text.includes('play')) {
            video.play_count = num;
          } else if (text.includes('点赞') || text.includes('like')) {
            video.like_count = num;
          } else if (text.includes('评论') || text.includes('comment')) {
            video.comment_count = num;
          } else if (text.includes('分享') || text.includes('share')) {
            video.share_count = num;
          }
        });

        if (video.video_id) {
          videos.push(video);
        }
      }

      // 方法2: 从页面数据中提取（更完整）
      const pageData = this.extractPageData();
      if (pageData && pageData.awemeList) {
        pageData.awemeList.forEach(aweme => {
          if (videos.length >= limit) return;
          
          const existingIndex = videos.findIndex(v => v.video_id === aweme.awemeId);
          if (existingIndex >= 0) {
            // 更新现有视频的完整信息
            videos[existingIndex] = {
              video_id: aweme.awemeId || '',
              title: aweme.desc || aweme.title || '',
              cover_url: aweme.video?.cover?.urlList?.[0] || aweme.video?.cover?.url || '',
              play_count: aweme.statistics?.playCount || 0,
              like_count: aweme.statistics?.diggCount || 0,
              comment_count: aweme.statistics?.commentCount || 0,
              share_count: aweme.statistics?.shareCount || 0,
              created_at: aweme.createTime ? new Date(aweme.createTime * 1000).toISOString() : null
            };
          } else {
            videos.push({
              video_id: aweme.awemeId || '',
              title: aweme.desc || aweme.title || '',
              cover_url: aweme.video?.cover?.urlList?.[0] || aweme.video?.cover?.url || '',
              play_count: aweme.statistics?.playCount || 0,
              like_count: aweme.statistics?.diggCount || 0,
              comment_count: aweme.statistics?.commentCount || 0,
              share_count: aweme.statistics?.shareCount || 0,
              created_at: aweme.createTime ? new Date(aweme.createTime * 1000).toISOString() : null
            });
          }
        });
      }

      return videos;
    } catch (error) {
      console.error('提取作品列表失败:', error);
      return [];
    }
  }

  // 滚动加载更多作品
  async scrollToLoadMore(maxScrolls = 5) {
    let scrollCount = 0;
    let lastHeight = document.documentElement.scrollHeight;

    while (scrollCount < maxScrolls) {
      // 滚动到底部
      window.scrollTo(0, document.documentElement.scrollHeight);
      
      // 等待内容加载
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newHeight = document.documentElement.scrollHeight;
      if (newHeight === lastHeight) {
        // 没有新内容加载
        break;
      }
      lastHeight = newHeight;
      scrollCount++;
    }
  }

  // 解析数字（处理"1.2万"、"10.5K"等格式）
  parseNumber(text) {
    if (!text) return 0;
    
    const cleanText = text.replace(/[^\d.万千KMB]/g, '');
    if (!cleanText) return 0;

    const num = parseFloat(cleanText);
    if (isNaN(num)) return 0;

    if (text.includes('万') || text.toUpperCase().includes('W')) {
      return Math.floor(num * 10000);
    } else if (text.toUpperCase().includes('K')) {
      return Math.floor(num * 1000);
    } else if (text.toUpperCase().includes('M')) {
      return Math.floor(num * 1000000);
    } else if (text.toUpperCase().includes('B')) {
      return Math.floor(num * 1000000000);
    }

    return Math.floor(num);
  }

  // 检查是否在用户主页
  isUserProfilePage() {
    const url = window.location.href;
    return url.includes('/user/') || url.includes('/profile/');
  }

  // 主采集方法
  async collectCreatorData(options = {}) {
    const startTime = Date.now();
    console.log('[Scraper] 开始采集达人数据:', {
      options,
      url: window.location.href
    });

    if (this.isCollecting) {
      console.error('[Scraper] 采集任务正在进行中');
      throw new Error('采集任务正在进行中');
    }

    if (!this.isUserProfilePage()) {
      console.error('[Scraper] 当前页面不是用户主页:', window.location.href);
      throw new Error('当前页面不是用户主页');
    }

    this.isCollecting = true;

    try {
      // 提取达人信息
      console.log('[Scraper] 开始提取达人信息...');
      const creatorStartTime = Date.now();
      const creatorInfo = this.extractCreatorInfo();
      const creatorTime = Date.now() - creatorStartTime;
      
      console.log('[Scraper] 达人信息提取完成:', {
        hasCreator: !!creatorInfo,
        userId: creatorInfo?.user_id,
        username: creatorInfo?.username,
        time: creatorTime + 'ms'
      });

      if (!creatorInfo || !creatorInfo.user_id) {
        console.error('[Scraper] 无法提取达人信息:', { creatorInfo });
        throw new Error('无法提取达人信息，请确保在用户主页');
      }

      // 如果需要采集作品，先滚动加载
      let videos = [];
      if (options.collectVideos !== false) {
        if (options.scrollToLoad) {
          console.log('[Scraper] 开始滚动加载更多作品...');
          await this.scrollToLoadMore(options.maxScrolls || 5);
        }
        console.log('[Scraper] 开始提取作品列表...');
        const videoStartTime = Date.now();
        videos = await this.extractVideos(options.videoLimit || 50);
        const videoTime = Date.now() - videoStartTime;
        console.log('[Scraper] 作品列表提取完成:', {
          videoCount: videos.length,
          time: videoTime + 'ms'
        });
      }

      const totalTime = Date.now() - startTime;
      console.log('[Scraper] 采集完成:', {
        creatorUserId: creatorInfo.user_id,
        videoCount: videos.length,
        totalTime: totalTime + 'ms'
      });

      return {
        creator: creatorInfo,
        videos: videos
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('[Scraper] 采集失败:', {
        error: error.message,
        stack: error.stack,
        totalTime: totalTime + 'ms'
      });
      throw error;
    } finally {
      this.isCollecting = false;
      console.log('[Scraper] 采集任务结束');
    }
  }
}

// 创建全局实例并立即挂载到window（必须在脚本执行时同步完成）
(function() {
  'use strict';
  const scraperInstance = new Scraper();
  
  // 立即挂载到window，确保content script可以立即访问
  if (typeof window !== 'undefined') {
    window.scraper = scraperInstance;
    console.log('[Scraper] Scraper对象已创建并挂载到window', {
      type: typeof window.scraper,
      hasCollectCreatorData: typeof window.scraper.collectCreatorData === 'function'
    });
  } else if (typeof self !== 'undefined') {
    // Service Worker环境
    self.scraper = scraperInstance;
    console.log('[Scraper] Scraper对象已创建并挂载到self');
  } else {
    console.error('[Scraper] 无法找到window或self对象');
  }
  
  // 同时也创建一个常量（如果模块系统需要）
  if (typeof window !== 'undefined') {
    window.__DOUYIN_SCRAPER_INSTANCE__ = scraperInstance;
  }
})();
