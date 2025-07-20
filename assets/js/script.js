// Global variables for carousel
let currentSlide = 0;
let totalSlides = 0;

// Copy to clipboard function
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        // Show success notification
        showNotification('Copied to clipboard! ✨');
    }).catch(function(err) {
        console.error('Could not copy text: ', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Copied to clipboard! ✨');
    });
}

// Show notification function
function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #00f0ff, #ff006e);
        color: white;
        padding: 15px 25px;
        border-radius: 25px;
        font-weight: bold;
        z-index: 1000;
        animation: slideInRight 0.5s ease, fadeOut 0.5s ease 2.5s;
        box-shadow: 0 0 20px rgba(0, 240, 255, 0.5);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Carousel functionality
function initCarousel() {
    const track = document.getElementById('carouselTrack');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const slides = document.querySelectorAll('.carousel-slide');
    
    if (!track || !prevBtn || !nextBtn || slides.length === 0) return;
    
    totalSlides = slides.length;
    
    // Set initial positions for all slides
    slides.forEach((slide, index) => {
        slide.style.left = `${index * 100}%`;
        // Add event listeners for image loading
        const images = track.querySelectorAll('img');
        let loadedImages = 0;
        images.forEach((img) => {
            img.addEventListener('load', () => {
                loadedImages++;
                if (loadedImages === images.length) {
                    updateCarousel();
                }
            });
            img.addEventListener('error', () => {
                console.error('Error loading image');
            });
        });
    });
    
    function updateCarousel() {
        if (!track) return;
        const translateX = -currentSlide * 100;
        track.style.transform = `translateX(${translateX}%)`;
        
        // Update active state for visual indication
        slides.forEach((slide, index) => {
            if (index === currentSlide) {
                slide.setAttribute('aria-current', 'true');
                slide.style.opacity = '1';
            } else {
                slide.removeAttribute('aria-current');
                slide.style.opacity = '0.8';
            }
        });
    }
    
    function nextSlide() {
        currentSlide = (currentSlide + 1) % totalSlides;
        updateCarousel();
    }
    
    function prevSlide() {
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        updateCarousel();
    }
    
    // Event listeners
    nextBtn.addEventListener('click', nextSlide);
    prevBtn.addEventListener('click', prevSlide);
    
    // Auto-advance carousel every 5 seconds
    const autoAdvance = setInterval(nextSlide, 5000);
    
    // Pause auto-advance on hover
    track.addEventListener('mouseenter', () => {
        clearInterval(autoAdvance);
    });
    
    track.addEventListener('mouseleave', () => {
        clearInterval(autoAdvance);
        autoAdvance = setInterval(nextSlide, 5000);
    });
    
    // Touch/swipe support for mobile
    let startX = 0;
    let endX = 0;
    let isDragging = false;
    
    track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        // Prevent default to avoid page scrolling while swiping
        e.preventDefault();
    }, { passive: false });
    
    track.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const currentX = e.touches[0].clientX;
        const diff = startX - currentX;
        // Add some resistance to the drag
        const dragOffset = diff * 0.5;
        track.style.transform = `translateX(${-currentSlide * 100 - dragOffset / track.offsetWidth * 100}%)`;
    });
    
    track.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        endX = e.changedTouches[0].clientX;
        const diff = startX - endX;
        if (Math.abs(diff) > 50) { // Minimum swipe distance
            if (diff > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        } else {
            // Return to current slide if swipe wasn't far enough
            updateCarousel();
        }
    });
    
    // Initialize the carousel
    updateCarousel();
    console.log('Carousel initialized with', totalSlides, 'slides');

}

// Intersection Observer for entrance animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe all sections
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        observer.observe(section);
    });
}

// Parallax effect for background elements
function initParallax() {
    const gridBackground = document.querySelector('.neon-grid-background');
    
    if (gridBackground) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            gridBackground.style.transform = `translateY(${rate}px)`;
        });
    }
}

// Add CSS animations dynamically
function addDynamicStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes fadeOut {
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
        
        .carousel-image {
            transition: all 0.3s ease;
        }
        
        .carousel-image:hover {
            transform: scale(1.05) rotate(1deg);
            filter: brightness(1.1) contrast(1.1);
        }
    `;
    document.head.appendChild(style);
}

// YouTube API integration
let youtubePlayer;

// Load YouTube API with error handling
function loadYouTubeAPI() {
    // Check if YouTube API is already loaded
    if (window.YT && window.YT.Player) {
        onYouTubeIframeAPIReady();
        return;
    }
    
    // Try to load YouTube API with fallback
    try {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.onerror = function() {
            console.warn('YouTube API failed to load, audio player will be limited');
            // Initialize volume controls without YouTube API
            initVolumeControls();
        };
        document.head.appendChild(script);
    } catch (error) {
        console.warn('Could not load YouTube API:', error);
        initVolumeControls();
    }
}

// Called automatically when YouTube API is ready
function onYouTubeIframeAPIReady() {
    const playerElement = document.querySelector('.audio-iframe');
    
    if (playerElement) {
        // Extract video ID from src attribute
        const src = playerElement.getAttribute('src');
        const videoId = src.match(/embed\/([^\?]+)/)?.[1];
        
        if (videoId) {
            try {
                youtubePlayer = new YT.Player(playerElement, {
                    videoId: videoId,
                    playerVars: {
                        autoplay: 1,
                        controls: 0,
                        showinfo: 0,
                        loop: 1,
                        fs: 0,
                        disablekb: 1,
                        playsinline: 1
                    },
                    events: {
                        'onReady': onPlayerReady,
                        'onStateChange': onPlayerStateChange
                    }
                });
            } catch (error) {
                console.warn('Error creating YouTube player:', error);
                initVolumeControls();
            }
        }
    } else {
        initVolumeControls();
    }
}

// When player is ready
function onPlayerReady(event) {
    // Set initial volume to 50%
    event.target.setVolume(50);
    
    // Initialize volume controls
    initVolumeControls();
    
    console.log('YouTube audio player ready!');
}

// When player state changes
function onPlayerStateChange(event) {
    // If video ends, replay it for continuous loop
    if (event.data === YT.PlayerState.ENDED) {
        event.target.playVideo();
    }
}

// Initialize volume controls
function initVolumeControls() {
    const volumeSlider = document.getElementById('volume-slider');
    const volumeToggle = document.getElementById('volume-toggle');
    
    if (volumeSlider && volumeToggle) {
        // Update volume when slider changes
        volumeSlider.addEventListener('input', function() {
            const volume = this.value;
            
            // Update slider background
            const percentage = volume + '%';
            this.style.background = `linear-gradient(to right, var(--neon-blue) ${percentage}, rgba(255, 255, 255, 0.2) ${percentage})`;
            
            // Update mute/unmute button
            volumeToggle.textContent = volume > 0 ? '🔊' : '🔇';
            
            // Store volume preference
            localStorage.setItem('bopVolume', volume);
            
            // Try to update YouTube player if available
            try {
                if (youtubePlayer && youtubePlayer.setVolume) {
                    youtubePlayer.setVolume(volume);
                }
            } catch (error) {
                console.warn('Could not set YouTube volume:', error);
            }
        });
        
        // Toggle mute/unmute
        volumeToggle.addEventListener('click', function() {
            try {
                if (youtubePlayer && youtubePlayer.isMuted && youtubePlayer.unMute && youtubePlayer.mute) {
                    if (youtubePlayer.isMuted()) {
                        youtubePlayer.unMute();
                        volumeToggle.textContent = '🔊';
                        volumeSlider.value = localStorage.getItem('bopVolume') || 50;
                    } else {
                        youtubePlayer.mute();
                        volumeToggle.textContent = '🔇';
                    }
                } else {
                    // Fallback for when YouTube API isn't available
                    const currentVolume = volumeSlider.value;
                    if (currentVolume > 0) {
                        volumeSlider.value = 0;
                        volumeToggle.textContent = '🔇';
                    } else {
                        volumeSlider.value = localStorage.getItem('bopVolume') || 50;
                        volumeToggle.textContent = '🔊';
                    }
                    // Trigger input event to update styling
                    volumeSlider.dispatchEvent(new Event('input'));
                }
            } catch (error) {
                console.warn('Could not toggle YouTube mute:', error);
            }
        });
        
        // Load saved volume preference
        const savedVolume = localStorage.getItem('bopVolume') || 50;
        volumeSlider.value = savedVolume;
        const percentage = savedVolume + '%';
        volumeSlider.style.background = `linear-gradient(to right, var(--neon-blue) ${percentage}, rgba(255, 255, 255, 0.2) ${percentage})`;
        volumeToggle.textContent = savedVolume > 0 ? '🔊' : '🔇';
    }
}

// Main initialization
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects to contract items
    const contractItems = document.querySelectorAll('.contract-item');
    contractItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px)';
            this.style.boxShadow = '0 0 30px var(--neon-pink)';
        });
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    });
    console.log('🚀 BOP website loaded successfully with cyberpunk enhancements!');
    
    // Initialize all features
    initCarousel();
    initScrollAnimations();
    // initParallax();
    addDynamicStyles();
    loadYouTubeAPI();
    
    // Get the current year for the footer if element exists
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
    
    // Add smooth scrolling for any anchor links
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Add hover effects to images
    const images = document.querySelectorAll('.hover-animate');
    images.forEach(img => {
        img.addEventListener('mouseenter', function() {
            this.style.filter = 'brightness(1.2) saturate(1.3) drop-shadow(0 0 20px #00f0ff)';
        });
        
        img.addEventListener('mouseleave', function() {
            this.style.filter = 'brightness(1) saturate(1) drop-shadow(none)';
        });
    });
    
    // Add loading animation to carousel images
    const carouselImages = document.querySelectorAll('.carousel-image');
    carouselImages.forEach((img, index) => {
        img.style.animationDelay = `${index * 0.1}s`;
    });
    
    console.log('✨ All BOP enhancements initialized!');
    
    // Initialize audio player
    initAudioPlayer();
});

// Audio player functionality
function initAudioPlayer() {
    const audio = document.getElementById('bop-audio');
    const volumeSlider = document.getElementById('volume-slider');
    const volumeToggle = document.getElementById('volume-toggle');
    
    if (!audio || !volumeSlider || !volumeToggle) {
        console.log('Audio elements not found, skipping audio initialization');
        return;
    }
    
    let isPlaying = false;
    
    // Function to attempt audio play with fallback
    async function tryPlayAudio() {
        try {
            await audio.play();
            isPlaying = true;
            volumeToggle.textContent = '🔊';
            console.log('🎵 Audio started playing');
        } catch (error) {
            console.log('⚠️ Autoplay blocked by browser. Click to play audio.');
            isPlaying = false;
            volumeToggle.textContent = '▶️';
            
            // Show user interaction prompt
            showAudioPrompt();
        }
    }
    
    // Show prompt for user to enable audio
    function showAudioPrompt() {
        const prompt = document.createElement('div');
        prompt.innerHTML = '🎵 Click to enable BOP vibes!';
        prompt.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(45deg, var(--neon-blue), var(--neon-pink));
            color: white;
            padding: 20px 30px;
            border-radius: 25px;
            font-weight: bold;
            z-index: 10000;
            cursor: pointer;
            box-shadow: 0 0 30px rgba(0, 240, 255, 0.8);
            animation: pulse 2s infinite;
        `;
        
        prompt.onclick = () => {
            tryPlayAudio();
            document.body.removeChild(prompt);
        };
        
        document.body.appendChild(prompt);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(prompt)) {
                document.body.removeChild(prompt);
            }
        }, 5000);
    }
    
    // Toggle play/pause and mute
    volumeToggle.addEventListener('click', async () => {
        if (!isPlaying) {
            await tryPlayAudio();
        } else {
            if (audio.muted) {
                audio.muted = false;
                volumeToggle.textContent = '🔊';
            } else {
                audio.muted = true;
                volumeToggle.textContent = '🔇';
            }
        }
    });
    
    // Update volume on slider change
    volumeSlider.addEventListener('input', () => {
        audio.volume = parseFloat(volumeSlider.value);
        if (audio.volume > 0 && audio.muted) {
            audio.muted = false;
            volumeToggle.textContent = '🔊';
        }
    });
    
    // Set initial volume
    audio.volume = 0.5;
    volumeSlider.value = '0.5';
    
    // Immediate audio start attempts
    // Try to play immediately
    tryPlayAudio();
    
    // Auto-start audio immediately on page load
    setTimeout(() => {
        // Automatically trigger the volume button click to start audio
        if (!isPlaying) {
            volumeToggle.click();
        }
    }, 50);
    
    // Another immediate attempt
    setTimeout(() => {
        if (!isPlaying) {
            audio.muted = false;
            audio.play().catch(() => {
                // If still fails, try clicking the button
                volumeToggle.click();
            });
        }
    }, 100);
    
    // Also try multiple times in case first attempt fails
    const autoPlayAttempts = [500, 1000, 2000];
    autoPlayAttempts.forEach(delay => {
        setTimeout(() => {
            if (!isPlaying) {
                tryPlayAudio();
            }
        }, delay);
    });
    
    // Try to play on any user interaction
    const userInteractionEvents = ['click', 'touchstart', 'keydown', 'mousemove'];
    userInteractionEvents.forEach(eventType => {
        document.addEventListener(eventType, function firstInteraction() {
            if (!isPlaying) {
                tryPlayAudio();
            }
            // Remove all event listeners after first successful play
            userInteractionEvents.forEach(event => {
                document.removeEventListener(event, firstInteraction);
            });
        }, { once: true });
    });
    
    // Try to play when page becomes visible or focused
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !isPlaying) {
            setTimeout(() => tryPlayAudio(), 100);
        }
    });
    
    window.addEventListener('focus', () => {
        if (!isPlaying) {
            setTimeout(() => tryPlayAudio(), 100);
        }
    });
    
    // Try to play when page is fully loaded
    if (document.readyState === 'complete') {
        setTimeout(() => {
            if (!isPlaying) {
                tryPlayAudio();
            }
        }, 200);
    } else {
        window.addEventListener('load', () => {
            setTimeout(() => {
                if (!isPlaying) {
                    tryPlayAudio();
                }
            }, 200);
        });
    }
    
    console.log('🎵 Audio player initialized with aggressive autoplay');
}