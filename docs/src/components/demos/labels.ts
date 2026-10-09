import type { PartialLabels } from "@scheduler/i18n";

// Example translations for the docs. Have a native speaker review a language
// before you ship it; the keys and the shape are what matter here.

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const de: PartialLabels = {
  resources: "Ressourcen",
  today: "Heute",
  previousPeriod: "Vorheriger Zeitraum",
  nextPeriod: "Nächster Zeitraum",
  view: "Ansicht",
  gridName: "Ressourcenplan",
  views: { day: "Tag", week: "Woche", month: "Monat", quarter: "Quartal", year: "Jahr" },
  viewTitle: (view) => `Ansicht: ${view}`,
  allDay: "Ganztägig",
  unavailable: "nicht verfügbar",
  to: "bis",
  help: (canResize) =>
    "Die Pfeiltasten bewegen den Cursor zwischen den Feldern. Eingabe oder Leertaste wählt ein Feld; mit Umschalt plus Pfeil links oder rechts werden mehrere gewählt. " +
    "Mit Tab zu einem Termin: Eingabe öffnet die Details, Leertaste nimmt ihn auf, die Pfeiltasten verschieben ihn" +
    (canResize ? ", Umschalt plus Pfeil links oder rechts ändert die Dauer" : "") +
    ", Leertaste legt ihn ab und Escape bricht ab.",
  announce: {
    pickedUp: (title, canResize) =>
      `${title} aufgenommen. Die Pfeiltasten verschieben, Leertaste legt ab, Escape bricht ab.${
        canResize ? " Mit Umschalt plus Pfeil links oder rechts ändern Sie die Dauer." : ""
      }`,
    moved: (title, place, allowed) => `${title}: ${place}${allowed ? "" : ". Hier nicht erlaubt"}`,
    cantGoFurther: "Weiter geht es nicht.",
    notAllowedHere: "Hier nicht erlaubt. Wählen Sie eine andere Stelle oder drücken Sie Escape zum Abbrechen.",
    droppedNoChange: (title) => `${title} abgelegt, keine Änderung.`,
    dropped: (title, place) => `${title} abgelegt. ${place}`,
    cancelled: (title) => `Abgebrochen. ${title} bleibt, wo es war.`,
    selected: (n) => `${plural(n, "Feld", "Felder")} ausgewählt.`,
    selecting: (n) => `${plural(n, "Feld", "Felder")} werden ausgewählt. Eingabe bestätigt, Escape bricht ab.`,
    selectionCancelled: "Auswahl abgebrochen.",
  },
};

export const es: PartialLabels = {
  resources: "Recursos",
  today: "Hoy",
  previousPeriod: "Periodo anterior",
  nextPeriod: "Periodo siguiente",
  view: "Vista",
  gridName: "Calendario de recursos",
  views: { day: "Día", week: "Semana", month: "Mes", quarter: "Trimestre", year: "Año" },
  viewTitle: (view) => `Vista: ${view}`,
  allDay: "Todo el día",
  unavailable: "no disponible",
  to: "a",
  help: (canResize) =>
    "Las flechas mueven el cursor entre las casillas. Intro o espacio selecciona una casilla; con Mayús y la flecha izquierda o derecha se seleccionan varias. " +
    "Con Tab llegas a un evento: Intro abre sus detalles, espacio lo recoge, las flechas lo mueven" +
    (canResize ? ", Mayús con la flecha izquierda o derecha cambia su duración" : "") +
    ", espacio lo suelta y Escape cancela.",
  announce: {
    pickedUp: (title, canResize) =>
      `${title} recogido. Las flechas lo mueven, espacio lo suelta, Escape cancela.${
        canResize ? " Mayús con la flecha izquierda o derecha cambia la duración." : ""
      }`,
    moved: (title, place, allowed) => `${title}: ${place}${allowed ? "" : ". No permitido aquí"}`,
    cantGoFurther: "No se puede ir más lejos.",
    notAllowedHere: "No permitido aquí. Muévelo a otro sitio o pulsa Escape para cancelar.",
    droppedNoChange: (title) => `${title} soltado, sin cambios.`,
    dropped: (title, place) => `${title} soltado. ${place}`,
    cancelled: (title) => `Cancelado. ${title} se queda donde estaba.`,
    selected: (n) => `${plural(n, "casilla seleccionada", "casillas seleccionadas")}.`,
    selecting: (n) => `${plural(n, "casilla", "casillas")} en la selección. Intro confirma, Escape cancela.`,
    selectionCancelled: "Selección cancelada.",
  },
};

export const fr: PartialLabels = {
  resources: "Ressources",
  today: "Aujourd'hui",
  previousPeriod: "Période précédente",
  nextPeriod: "Période suivante",
  view: "Vue",
  gridName: "Planning des ressources",
  views: { day: "Jour", week: "Semaine", month: "Mois", quarter: "Trimestre", year: "Année" },
  viewTitle: (view) => `Vue : ${view}`,
  allDay: "Toute la journée",
  unavailable: "indisponible",
  to: "à",
  help: (canResize) =>
    "Les flèches déplacent le curseur entre les créneaux. Entrée ou espace sélectionne un créneau ; avec Maj et la flèche gauche ou droite, on en sélectionne plusieurs. " +
    "Avec Tab, allez sur un événement : Entrée ouvre ses détails, espace le saisit, les flèches le déplacent" +
    (canResize ? ", Maj avec la flèche gauche ou droite change sa durée" : "") +
    ", espace le dépose et Échap annule.",
  announce: {
    pickedUp: (title, canResize) =>
      `${title} saisi. Les flèches le déplacent, espace le dépose, Échap annule.${
        canResize ? " Maj avec la flèche gauche ou droite change la durée." : ""
      }`,
    moved: (title, place, allowed) => `${title} : ${place}${allowed ? "" : ". Non autorisé ici"}`,
    cantGoFurther: "Impossible d'aller plus loin.",
    notAllowedHere: "Non autorisé ici. Choisissez un autre endroit ou appuyez sur Échap pour annuler.",
    droppedNoChange: (title) => `${title} déposé, aucun changement.`,
    dropped: (title, place) => `${title} déposé. ${place}`,
    cancelled: (title) => `Annulé. ${title} reste où il était.`,
    selected: (n) => `${plural(n, "créneau sélectionné", "créneaux sélectionnés")}.`,
    selecting: (n) => `${plural(n, "créneau", "créneaux")} dans la sélection. Entrée confirme, Échap annule.`,
    selectionCancelled: "Sélection annulée.",
  },
};

// Only the toolbar: anything you leave out stays English.
export const ar: PartialLabels = {
  resources: "الموارد",
  today: "اليوم",
  previousPeriod: "الفترة السابقة",
  nextPeriod: "الفترة التالية",
  view: "العرض",
  views: { day: "يوم", week: "أسبوع", month: "شهر", quarter: "ربع سنة", year: "سنة" },
  viewTitle: (view) => `العرض: ${view}`,
  allDay: "طوال اليوم",
  unavailable: "غير متاح",
  to: "إلى",
};

export const ja: PartialLabels = {
  resources: "リソース",
  today: "今日",
  previousPeriod: "前の期間",
  nextPeriod: "次の期間",
  view: "表示",
  views: { day: "日", week: "週", month: "月", quarter: "四半期", year: "年" },
  viewTitle: (view) => `${view}表示`,
  allDay: "終日",
};
