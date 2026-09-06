'use strict';

document.documentElement.classList.add('js');

const cameras = {
  reception: {
    src: 'assets/reception.png',
    alt: 'Recepción vacía de un hotel antiguo: mostrador de madera, casillero de llaves y una lámpara encendida.',
    location: 'CAM 01 — RECEPCIÓN',
    title: 'Todo parece estar en orden.',
    description: 'Las llaves siguen en su sitio. El registro está cerrado. Entonces suena el teléfono.'
  },
  corridor: {
    src: 'assets/corridor.png',
    alt: 'Un largo pasillo de hotel con puertas de madera, alfombra oscura y luces cálidas que se desvanecen a lo lejos.',
    location: 'CAM 02 — LOS PASILLOS',
    title: 'Este pasillo no estaba aquí.',
    description: 'Puertas que se repiten. Habitaciones desocupadas. Un recorrido que ya no puedes memorizar.'
  },
  security: {
    src: 'assets/security.png',
    alt: 'Una oficina de vigilancia vacía, con monitores CRT que muestran los pasillos del hotel y una lámpara de escritorio.',
    location: 'CAM 03 — VIGILANCIA',
    title: 'Las cámaras también miran.',
    description: 'Una pared de monitores. Pasillos vacíos. La sensación de que alguien acaba de salir del encuadre.'
  }
};

const tabs = [...document.querySelectorAll('.camera-tab')];
const screen = document.querySelector('.camera-screen');
const panel = document.getElementById('camera-panel');
const picture = document.getElementById('camera-image');
const status = document.getElementById('camera-status');
let requestNumber = 0;

async function activateCamera(tab) {
  const data = cameras[tab.dataset.camera];
  if (!data) return;
  if (tab.getAttribute('aria-selected') === 'true') {
    requestNumber++;
    screen.classList.remove('is-switching');
    panel.removeAttribute('aria-busy');
    status.textContent = '';
    return;
  }
  const currentRequest = ++requestNumber;
  screen.classList.add('is-switching');
  panel.setAttribute('aria-busy', 'true');
  status.textContent = '';

  const nextImage = new Image();
  nextImage.src = data.src;
  try {
    await nextImage.decode();
    if (currentRequest !== requestNumber) return;
    picture.src = data.src;
    picture.alt = data.alt;
    document.getElementById('camera-location').textContent = data.location;
    document.getElementById('camera-title').textContent = data.title;
    document.getElementById('camera-description').textContent = data.description;
    panel.setAttribute('aria-labelledby', tab.id);
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
  } catch {
    if (currentRequest === requestNumber) status.textContent = 'No se pudo cargar esta escena. Selecciona la cámara para volver a intentarlo.';
  } finally {
    if (currentRequest === requestNumber) {
      screen.classList.remove('is-switching');
      panel.removeAttribute('aria-busy');
    }
  }
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateCamera(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    tabs[next].focus();
    activateCamera(tabs[next]);
  });
});
