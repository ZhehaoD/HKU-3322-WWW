document.addEventListener('DOMContentLoaded', function () {
    const songCards = document.querySelectorAll('#song-card');
    songCards.forEach(card => {
        const index = card.getAttribute('data-index');
        const play = card.querySelector(`#play${index}`);
        const audio = card.querySelector(`#audio${index}`);
        const playImg = 'play.png';
        const pauseImg = 'pause.png';

        if (play && audio) {
            const musid = play.dataset.musid;
            const storedTime = sessionStorage.getItem(musid);
            if (storedTime) {
                audio.currentTime = parseFloat(storedTime);
            }

            play.addEventListener('click', function () {
                const isPlaying = this.src.endsWith(pauseImg);
                if (isPlaying) {
                    this.src = playImg;
                    sessionStorage.setItem(musid, audio.currentTime);
                    audio.pause();
                } else {
                    window.location.href = `file.php?musid=${musid}`;
                    this.src = pauseImg;
                    const storedTime = sessionStorage.getItem(musid);
                    if (storedTime) {
                        audio.currentTime = parseFloat(storedTime);
                    }
                    sessionStorage.setItem(musid, audio.currentTime);
                    audio.play();
                }
            });

            audio.addEventListener('ended', function () {
                play.src = playImg;
                fetch(`file.php?action=update_pcount&musid=${musid}`)
                   .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.text();
                    })
                   .catch(error => {
                        console.error('There has been a problem with your fetch operation:', error);
                    });
                sessionStorage.removeItem(musid);
            });
        }
    });

    const searchInput = document.getElementById('Search');
    const genreButtons = document.querySelectorAll('button[id="btn"]');

    if (searchInput) {
        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                const searchQuery = searchInput.value;
                if (searchQuery!== undefined && searchQuery!== null) {
                    const trimmedQuery = searchQuery.trim();
                    if (trimmedQuery!== '') {
                        window.location.href = 'index.php?search=' + trimmedQuery;
                        searchInput.value = '';
                    }
                }
            }
        });
    }

    if (genreButtons.length > 0) {
        genreButtons.forEach(button => {
            button.addEventListener('click', function () {
                const genre = this.textContent;
                window.location.href = 'index.php?search=' + genre;
            });
        });
    }
});