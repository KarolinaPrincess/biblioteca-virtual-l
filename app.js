document.addEventListener('DOMContentLoaded', async function () {
  // Elementos del DOM
  const booksContainer = document.getElementById('books-container');
  const bookDetails = document.getElementById('book-details');
  const searchInput = document.querySelector('.search-input');
  const navItems = document.querySelectorAll('.navbar-link');
  const modal = document.getElementById('book-modal');
  const closeModal = document.querySelector('.close-modal');
  const infoBtn = document.querySelector('.info-btn');
  const bookInfoTooltip = document.querySelector('.book-info-tooltip');
  
  let catalogoCompleto = {};
  let libroActual = null;
  let currentBook = null;
  let currentRendition = null;

  // Verificar EPUB.js - Función mejorada
  function checkEPUB() {
    if (typeof ePub === 'undefined' || !ePub) {
      console.error('EPUB.js no está cargado correctamente');
      // Mostrar mensaje de error al usuario
      const errorElement = document.createElement('div');
      errorElement.style.color = 'red';
      errorElement.style.padding = '20px';
      errorElement.innerHTML = `
        <h3>Error crítico</h3>
        <p>El visor de libros no está disponible.</p>
        <p>Por favor verifica que:</p>
        <ul>
          <li>Las librerías JSZip y EPUB.js estén cargadas</li>
          <li>No haya errores en la consola del navegador</li>
        </ul>
      `;
      document.body.prepend(errorElement);
      return false;
    }
    console.log('EPUB.js cargado correctamente. Versión:', window.ePub?.version);
    return true;
  }

  // Verificar al inicio
  if (!checkEPUB()) {
    return;
  }

  // Cargar catálogo
  try {
    const res = await fetch('books.json');
    catalogoCompleto = await res.json();
    document.querySelector('.navbar-link[data-category="literatura"]').classList.add('active');
    mostrarLibrosPorCategoria('literatura');
  } catch (error) {
    console.error('Error al cargar el catálogo:', error);
    booksContainer.innerHTML = '<p>No se pudo cargar el catálogo.</p>';
  }

  // Manejar clics del menú
  navItems.forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      navItems.forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      mostrarLibrosPorCategoria(this.getAttribute('data-category'));
    });
  });

  // Mostrar libros por categoría
  function mostrarLibrosPorCategoria(categoria) {
    const libros = catalogoCompleto[categoria] || [];
    mostrarLibrosEnPantalla(libros);
  }

  // Mostrar detalles del libro
  function mostrarDetalleLibro(libro) {
    libroActual = libro;
    bookDetails.innerHTML = `
      <h2>${libro.titulo}</h2>
      <span class="author">Autor: ${libro.autor}</span>
      <p class="synopsis"><strong>Sinopsis:</strong> ${libro.sinopsis}</p>
      <p class="description">${libro.descripcion_autor}</p>
      <p class="description">Publicado: ${libro.publicado}</p>
      <p class="description">Páginas: ${libro.paginas}</p>
      <p class="description">Género: ${libro.genero}</p>
      <button class="btn-leer-libro">Leer libro</button>
    `;

    // Evento para leer libro
    document.querySelector('.btn-leer-libro').addEventListener('click', () => {
      abrirModalLibro(libro);
    });
  }

  // Función para abrir el modal
  function abrirModalLibro(libro) {
    if (!checkEPUB()) return;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Actualizar tooltip de información
    bookInfoTooltip.innerHTML = `
      <h2>${libro.titulo}</h2>
      <span class="author">${libro.autor}</span>
      <p class="synopsis">${libro.sinopsis}</p>
      <div class="book-meta">
        <p><strong>Publicado:</strong> ${libro.publicado}</p>
        <p><strong>Páginas:</strong> ${libro.paginas}</p>
        <p><strong>Género:</strong> ${libro.genero}</p>
      </div>
    `;
    
    cargarEpub(libro.enlace);
  }

  // Cerrar modal
  closeModal.addEventListener('click', () => {
    cerrarModal();
  });

  // Botón de información
  infoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    bookInfoTooltip.style.display = bookInfoTooltip.style.display === 'block' ? 'none' : 'block';
  });

  // Cerrar tooltip al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!bookInfoTooltip.contains(e.target) && e.target !== infoBtn) {
      bookInfoTooltip.style.display = 'none';
    }
  });

  // Cerrar al hacer clic fuera del modal
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      cerrarModal();
    }
  });

  function cerrarModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    bookInfoTooltip.style.display = 'none';
    
    if (currentBook) {
      currentBook.destroy();
      currentBook = null;
      currentRendition = null;
    }
    
    document.getElementById('epub-viewer').innerHTML = '';
    document.querySelector('.progress-bar').style.width = '0%';
  }

  // Mostrar libros en pantalla
  function mostrarLibrosEnPantalla(libros) {
    booksContainer.innerHTML = '';
    
    if (!libros.length) {
      booksContainer.innerHTML = '<p>No se encontraron libros.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    
    libros.forEach(libro => {
      const card = document.createElement('div');
      card.className = 'book-card';
      card.innerHTML = `
        <h3>${libro.titulo}</h3>
        <a href="${libro.enlace}" target="_blank" class="book-link">Descargar libro</a>
      `;
      
      card.addEventListener('click', () => mostrarDetalleLibro(libro));
      fragment.appendChild(card);
    });
    
    booksContainer.appendChild(fragment);
  }

  // Función para cargar EPUB
  async function cargarEpub(epubUrl) {
    if (!checkEPUB()) return;
    
    const viewer = document.getElementById('epub-viewer');
    

    try {
      const response = await fetch(epubUrl);
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      
      const blob = await response.blob();
      currentBook = window.ePub(blob);
      
      currentRendition = currentBook.renderTo('epub-viewer', {
        width: '100%',
        height: '100%',
        spread: 'none',
        manager: 'continuous'
      });

      await currentRendition.display();
      
      // Configurar controles de navegación
      document.querySelector('.epub-prev').addEventListener('click', () => currentRendition.prev());
      document.querySelector('.epub-next').addEventListener('click', () => currentRendition.next());
      
      // Barra de progreso
      const progressBar = document.querySelector('.progress-bar');
      
      currentRendition.on('relocated', function(location) {
        const progress = (location.start.percentage * 100);
        progressBar.style.width = `${progress}%`;
      });
      
      // Atajos de teclado
      document.addEventListener('keydown', function(e) {
        if (modal.style.display === 'block') {
          if (e.key === 'ArrowLeft') {
            currentRendition.prev();
          } else if (e.key === 'ArrowRight') {
            currentRendition.next();
          } else if (e.key === 'Escape') {
            cerrarModal();
          }
        }
      });

      // Estilos para el contenido
      currentRendition.themes.default({
        'body': {
          'color': '#E0E1DD',
          'font-family': 'Georgia, serif',
          'line-height': '1.8',
          'padding': '0',
          'font-size': '1.1em',
          'background-color': '#1B263B'
        },
        'p': {
          'margin-bottom': '1.5em'
        },
        'h1, h2, h3, h4, h5, h6': {
          'color': '#E0E1DD',
          'border-bottom': '1px solid #415A77'
        }
      });

    } catch (err) {
      console.error('Error al cargar EPUB:', err);
      viewer.innerHTML = `
        <div class="error-message" style="text-align: center; padding: 2rem; color: #E0E1DD;">
          <h3>Error al cargar el libro</h3>
          <p>${err.message}</p>
          <button onclick="location.reload()" style="
            background-color: #415A77;
            color: #E0E1DD;
            border: none;
            padding: 0.8rem 1.5rem;
            margin-top: 1rem;
            border-radius: 4px;
            cursor: pointer;
          ">Reintentar</button>
        </div>
      `;
    }
  }

  // Búsqueda de libros
  searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase().trim();
    const categoriaActual = document.querySelector('.navbar-link.active')?.getAttribute('data-category') || 'literatura';
    
    const librosFiltrados = catalogoCompleto[categoriaActual]?.filter(libro =>
      libro.titulo.toLowerCase().includes(searchTerm) || 
      libro.autor.toLowerCase().includes(searchTerm)
    ) || [];
    
    mostrarLibrosEnPantalla(librosFiltrados);
  });
});