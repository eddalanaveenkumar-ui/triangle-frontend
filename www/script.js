document.addEventListener('DOMContentLoaded', async () => {
    const videosGrid = document.getElementById('videosGrid');
    let players = {};
    let isFetching = false;
    let currentSkip = 0;
    let intersectionObserver;

    async function fetchFeedVideos(isInitialLoad = false) {
        if (isFetching) return;
        isFetching = true;

        const limit = isInitialLoad ? 10 : 3;

        try {
            const userProfile = JSON.parse(localStorage.getItem('userProfile'));
            const payload = {
                state: userProfile?.state || "india",
                language: userProfile?.language || "telugu",
                limit: limit,
                skip: currentSkip,
                is_short: null // Mixed feed
            };

            const response = await fetch(`${API_BASE_URL}/feed`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();

            if (data && data.length > 0) {
                appendVideos(data, videosGrid);
                currentSkip += data.length;
            } else {
                if (intersectionObserver) intersectionObserver.disconnect();
            }
        } catch (error) {
            console.error('Error fetching feed videos:', error);
        } finally {
            isFetching = false;
        }
    }

    function appendVideos(videos, container) {
        if (!container) return;

        videos.forEach(video => {
            const videoId = video.id || video.video_id;
            const videoCard = document.createElement('div');
            videoCard.className = 'video-card';
            videoCard.dataset.videoId = videoId;

            videoCard.innerHTML = `
                <div id="player-${videoId}" class="video-player"></div>
                <div class="video-overlay">
                    <div class="video-header">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(video.channel)}&background=random" class="channel-avatar-small">
                        <span class="channel-name-small">${video.channel}</span>
                    </div>
                    <div class="video-footer">
                        <div class="video-info">
                            <h1 class="video-title">${video.title}</h1>
                        </div>
                        <div class="video-actions-vertical">
                            <button class="video-action-btn"><i class="far fa-heart"></i><span>${formatNumber(video.likes)}</span></button>
                            <button class="video-action-btn"><i class="far fa-comment"></i><span>${formatNumber(video.comment_count)}</span></button>
                            <button class="video-action-btn"><i class="fas fa-share"></i></button>
                            <button class="video-action-btn"><i class="far fa-bookmark"></i></button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(videoCard);
            createPlayer(videoId);
            intersectionObserver.observe(videoCard);
        });
    }

    function createPlayer(videoId) {
        players[videoId] = new YT.Player(`player-${videoId}`, {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                'autoplay': 0,
                'controls': 0,
                'rel': 0,
                'loop': 1,
                'playlist': videoId,
                'mute': 1,
                'playsinline': 1
            },
            events: {
                'onReady': (e) => {
                    // The first video will be played by the observer
                }
            }
        });
    }

    function setupIntersectionObserver() {
        intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const videoId = entry.target.dataset.videoId;
                const player = players[videoId];

                if (entry.isIntersecting) {
                    if (player && typeof player.playVideo === 'function') {
                        player.playVideo();
                    }
                } else {
                    if (player && typeof player.pauseVideo === 'function') {
                        player.pauseVideo();
                    }
                }
            });
        }, { threshold: 0.75 });
    }

    function formatNumber(num) {
        if (!num) return '0';
        num = parseInt(num);
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    // Initial Load
    if (videosGrid) {
        loadYouTubeAPI(() => {
            setupIntersectionObserver();
            fetchFeedVideos(true); // Initial fetch of 10 videos
        });
    }
});
