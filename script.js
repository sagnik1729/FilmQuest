const API_KEY = 'a4ae930d';
const BASE_URL = 'https://www.omdbapi.com/';
const YT_API_KEY = 'YOUR_YOUTUBE_API_KEY'; // Replace with your actual YouTube API key
const YT_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

let currentPage = 1;
let totalResults = 0;
let searchQuery = '';

// DOM Elements
const elements = {
    searchInput: document.getElementById('searchInput'),
    movieResults: document.getElementById('movieResults'),
    pagination: document.getElementById('pagination'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    lightbox: document.getElementById('lightbox'),
    movieDetails: document.getElementById('movieDetails'),
    genreFilter: document.getElementById('genreFilter'),
    ratingFilter: document.getElementById('ratingFilter')
};

// Debounce function to limit the API calls
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
};

// NEW: Fetch movie details using the OMDb API
const fetchMovieDetails = async (imdbID) => {
    const url = `${BASE_URL}?apikey=${API_KEY}&i=${imdbID}&plot=full`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
};

// NEW: Display movies in the movie grid
const displayMovies = (movies) => {
    elements.movieResults.innerHTML = '';
    if (!movies || movies.length === 0) {
        elements.movieResults.innerHTML = '<p>No movies found.</p>';
        return;
    }
    movies.forEach(movie => {
        const movieCard = document.createElement('div');
        movieCard.classList.add('movie-card');
        movieCard.innerHTML = `
      <img src="${movie.Poster !== 'N/A' ? movie.Poster : 'placeholder.jpg'}" alt="${movie.Title}" class="movie-poster">
      <div class="movie-info">
        <h3>${movie.Title}</h3>
        <div class="rating">
          <i class="fas fa-star"></i>
          <span>${movie.imdbRating || 'N/A'}</span>
        </div>
      </div>
    `;
        movieCard.addEventListener('click', () => showMovieDetails(movie.imdbID));
        elements.movieResults.appendChild(movieCard);
    });
};

// NEW: Display pagination buttons based on total results
const displayPagination = () => {
    elements.pagination.innerHTML = '';
    const totalPages = Math.ceil(totalResults / 10); // OMDb returns 10 results per page
    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        if (i === currentPage) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            currentPage = i;
            fetchMovies(searchQuery, currentPage);
        });
        elements.pagination.appendChild(button);
    }
};

// Fetch movies with applied filters
const fetchMovies = async (query, page = 1) => {
    if (!query) return;

    elements.loadingSpinner.classList.remove('hidden');
    try {
        const rating = elements.ratingFilter.value;
        const genre = elements.genreFilter.value;
        let url = `${BASE_URL}?apikey=${API_KEY}&s=${query}&page=${page}&type=movie`;

        // Note: The OMDb API does not support a genre parameter. This remains for client-side filtering if desired.
        if (genre) url += `&genre=${genre}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.Response === 'True') {
            totalResults = parseInt(data.totalResults);
            let movies = data.Search;

            // Client-side rating filter
            if (rating > 0) {
                movies = await Promise.all(movies.map(async movie => {
                    const details = await fetchMovieDetails(movie.imdbID);
                    return { ...movie, imdbRating: details.imdbRating };
                }));
                movies = movies.filter(movie => parseFloat(movie.imdbRating) >= rating);
            }

            displayMovies(movies);
            displayPagination();
        } else {
            elements.movieResults.innerHTML = `<p>${data.Error}</p>`;
            elements.pagination.innerHTML = '';
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        elements.loadingSpinner.classList.add('hidden');
    }
};

// Enhanced Movie Details with YouTube Trailer
const showMovieDetails = async (imdbID) => {
    try {
        const movie = await fetchMovieDetails(imdbID);
        const trailer = await fetchYouTubeTrailer(movie.Title);

        elements.movieDetails.innerHTML = `
      <div class="trailer-container">
        ${trailer ? `<iframe src="https://www.youtube.com/embed/${trailer}" frameborder="0" allowfullscreen></iframe>` : ''}
      </div>
      <h2>${movie.Title} (${movie.Year})</h2>
      <div class="details-grid">
        <div class="detail-item">
          <i class="fas fa-star"></i>
          <span>${movie.imdbRating}</span>
        </div>
        <div class="detail-item">
          <i class="fas fa-clock"></i>
          <span>${movie.Runtime}</span>
        </div>
        <p>${movie.Plot}</p>
        <div class="reviews">
          <h3>Reviews</h3>
          ${movie.Ratings.map(rating => `
            <div class="review">
              <span class="source">${rating.Source}</span>
              <span class="value">${rating.Value}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

        elements.lightbox.classList.add('show');
    } catch (error) {
        console.error('Error:', error);
    }
};

// Fetch YouTube trailer for the movie
const fetchYouTubeTrailer = async (title) => {
    try {
        const response = await fetch(`${YT_SEARCH_URL}?part=snippet&q=${encodeURIComponent(title)}+trailer&key=${YT_API_KEY}&type=video`);
        const data = await response.json();
        return data.items[0]?.id?.videoId || null;
    } catch (error) {
        return null;
    }
};

// Event Listeners
elements.searchInput.addEventListener('input', debounce(() => {
    searchQuery = elements.searchInput.value.trim();
    currentPage = 1;
    fetchMovies(searchQuery);
}, 500));

elements.lightbox.addEventListener('click', (e) => {
    if (e.target.classList.contains('lightbox') || e.target.classList.contains('close-btn')) {
        elements.lightbox.classList.remove('show');
    }
});

// Initialize genre filter options
const init = () => {
    const genres = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi'];
    genres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        elements.genreFilter.appendChild(option);
    });
};

init();

// Your API key (a4ae930d) has been appended to all OMDb API requests.
