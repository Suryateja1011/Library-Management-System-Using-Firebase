// Firebase config - replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "Your API KEY",
  authDomain: "library-management-syste-7a4c2.firebaseapp.com",
  projectId: "library-management-syste-7a4c2",
  storageBucket: "library-management-syste-7a4c2.firebasestorage.app",
  messagingSenderId: "208075044812",
  appId: "1:208075044812:web:55f741e83b0ee261ce4f69",
  measurementId: "G-3XJ6DHKGTC"
};
// Initialize Firebase


firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// DOM
const bookForm = document.getElementById('book-form');
const booksList = document.getElementById('books-list');
const searchInput = document.getElementById('search-input');
const filterGenre = document.getElementById('filter-genre');
const filterStatus = document.getElementById('filter-status');
const statsDiv = document.getElementById('stats');

const userInfoDiv = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const authFormsDiv = document.getElementById('auth-forms');
const btnLogin = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');
const btnGoogleSignin = document.getElementById('btn-google-signin');
const btnLogout = document.getElementById('btn-logout');

let books = [];
let currentUserRole = 'guest'; // default

// Authentication state change handler
auth.onAuthStateChanged(async (user) => {
  if (user) {
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.exists) {
      currentUserRole = userDoc.data().role || 'member';
    } else {
      // New users are members by default
      await db.collection('users').doc(user.uid).set({
        email: user.email,
        role: 'member',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      currentUserRole = 'member';
    }
    updateUIForUser(user, currentUserRole);
  } else {
    currentUserRole = 'guest';
    updateUIForUser(null);
  }
});

// UI update based on auth
function updateUIForUser(user, role) {
  if (user) {
    userInfoDiv.style.display = 'block';
    authFormsDiv.style.display = 'none';
    userEmailSpan.textContent = `${user.email} (${role})`;
  } else {
    userInfoDiv.style.display = 'none';
    authFormsDiv.style.display = 'block';
    userEmailSpan.textContent = '';
  }
  applyRolePermissions();
}

// Signup
btnSignup.addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!email || !password) {
    alert('Enter email and password');
    return;
  }
  try {
    await auth.createUserWithEmailAndPassword(email, password);
  } catch (err) {
    alert('Signup failed: ' + err.message);
  }
});

// Login
btnLogin.addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!email || !password) {
    alert('Enter email and password');
    return;
  }
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    alert('Login failed: ' + err.message);
  }
});

// Google Sign-In
btnGoogleSignin.addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
  } catch (err) {
    alert('Google sign-in failed: ' + err.message);
  }
});

// Logout
btnLogout.addEventListener('click', () => {
  auth.signOut();
});

// Apply role permissions
function applyRolePermissions() {
  if (currentUserRole === 'admin') {
    bookForm.style.display = 'block';
  } else {
    bookForm.style.display = 'none';
  }
  renderBooks();
}

// Add book
bookForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = bookForm.title.value.trim();
  const author = bookForm.author.value.trim();
  const genre = bookForm.genre.value;
  const year = parseInt(bookForm.year.value) || null;
  const quantity = Math.max(1, parseInt(bookForm.quantity.value) || 1);

  if (!title || !author || !genre || quantity < 1) {
    alert('Please fill in all required fields correctly.');
    return;
  }

  try {
    await db.collection('books').add({
      title,
      author,
      genre,
      year,
      quantity,
      borrowed: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    bookForm.reset();
    bookForm.genre.selectedIndex = 0;
  } catch (error) {
    alert('Failed to add book. Please try again.');
  }
});

// Render books list
function renderBooks() {
  booksList.innerHTML = '';

  const searchTerm = searchInput.value.toLowerCase();
  const genreFilter = filterGenre.value;
  const statusFilter = filterStatus.value;

  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchTerm) ||
      book.author.toLowerCase().includes(searchTerm);
    const matchesGenre = genreFilter ? book.genre === genreFilter : true;
    let matchesStatus = true;

    const availableCount = book.quantity - book.borrowed;
    if (statusFilter === 'available') matchesStatus = availableCount > 0;
    else if (statusFilter === 'borrowed') matchesStatus = book.borrowed > 0;

    return matchesSearch && matchesGenre && matchesStatus;
  });

  if (filteredBooks.length === 0) {
    booksList.innerHTML = '<p>No books found matching the criteria.</p>';
    statsDiv.innerText = '';
    return;
  }

  filteredBooks.forEach((book) => {
    const availableCount = book.quantity - book.borrowed;

    const card = document.createElement('div');
    card.className = 'book-card';

    const infoDiv = document.createElement('div');
    infoDiv.className = 'book-info';

    const titleEl = document.createElement('p');
    titleEl.className = 'book-title';
    titleEl.textContent = book.title;

    const detailsEl = document.createElement('p');
    detailsEl.className = 'book-details';
    detailsEl.textContent =
      `${book.author} | ${book.genre}` + (book.year ? ` | ${book.year}` : '');

    infoDiv.appendChild(titleEl);
    infoDiv.appendChild(detailsEl);

    // Status badge
    const statusSpan = document.createElement('span');
    statusSpan.className = 'status ' + (availableCount > 0 ? 'available' : 'borrowed');
    statusSpan.textContent =
      availableCount > 0 ? `Available (${availableCount})` : `Borrowed out`;

    // Borrow/Return button
    const btn = document.createElement('button');
    btn.className = 'btn-borrow-return';

    const userCanInteract = currentUserRole === 'admin' || currentUserRole === 'member';

    if (availableCount > 0) {
      btn.textContent = 'Borrow';
      btn.title = 'Click to borrow this book';
      btn.classList.remove('return-btn');
      btn.classList.add('borrow-btn');
      btn.disabled = !userCanInteract;
      btn.onclick = () => updateBorrowStatus(book.id, 1);
    } else if (book.borrowed > 0) {
      btn.textContent = 'Return';
      btn.title = 'Click to return this book';
      btn.classList.remove('borrow-btn');
      btn.classList.add('return-btn');
      btn.disabled = !userCanInteract;
      btn.onclick = () => updateBorrowStatus(book.id, -1);
    } else {
      btn.textContent = 'N/A';
      btn.disabled = true;
      btn.classList.remove('borrow-btn', 'return-btn');
    }

    card.appendChild(infoDiv);
    card.appendChild(statusSpan);
    card.appendChild(btn);

    booksList.appendChild(card);
  });

  updateStats(filteredBooks);
}

// Update borrow/return status
async function updateBorrowStatus(bookId, delta) {
  try {
    const bookRef = db.collection('books').doc(bookId);
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(bookRef);
      if (!doc.exists) throw 'Book does not exist!';

      const currentBorrowed = doc.data().borrowed || 0;
      const quantity = doc.data().quantity || 0;

      let newBorrowed = currentBorrowed + delta;
      if (newBorrowed < 0) newBorrowed = 0;
      if (newBorrowed > quantity) newBorrowed = quantity;

      transaction.update(bookRef, { borrowed: newBorrowed });
    });
  } catch (error) {
    alert('Failed to update borrow status. Try again.');
  }
}

// Update statistics display
function updateStats(filteredBooks) {
  const totalBooks = filteredBooks.reduce((sum, b) => sum + b.quantity, 0);
  const totalBorrowed = filteredBooks.reduce((sum, b) => sum + b.borrowed, 0);
  const totalAvailable = totalBooks - totalBorrowed;

  const genreCounts = {};
  filteredBooks.forEach((book) => {
    genreCounts[book.genre] = (genreCounts[book.genre] || 0) + book.quantity;
  });

  let genreStats = Object.entries(genreCounts)
    .map(([genre, count]) => `${genre}: ${count}`)
    .join(' | ');

  statsDiv.innerText = `Total Books: ${totalBooks} | Available: ${totalAvailable} | Borrowed: ${totalBorrowed}\nGenres: ${genreStats}`;
}

// Listen to Firestore books collection
db.collection('books')
  .orderBy('createdAt', 'desc')
  .onSnapshot((snapshot) => {
    books = [];
    snapshot.forEach((doc) => {
      books.push({ id: doc.id, ...doc.data() });
    });
    renderBooks();
  });

// Filters and search listeners
searchInput.addEventListener('input', renderBooks);
filterGenre.addEventListener('change', renderBooks);
filterStatus.addEventListener('change', renderBooks);
