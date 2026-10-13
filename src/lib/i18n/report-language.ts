/**
 * Export language selection (pure).
 *
 * Report exports — the Sovereign Public Value Canvas™ and the pilot evidence
 * timeline — can be produced in more than one working language. Only the
 * report chrome is translated: headings, column names and controlled
 * vocabularies. Free text written by participants is never machine-translated,
 * because an evidence artefact must quote what was actually recorded.
 */

import type { CanvasConfidence, CanvasSection } from "@/lib/workshops.public-value";
import { CANVAS_SECTIONS } from "@/lib/workshops.public-value";

export const REPORT_LANGUAGES = ["en", "fr", "es", "de", "ar"] as const;
export type ReportLanguage = (typeof REPORT_LANGUAGES)[number];

export const REPORT_LANGUAGE_LABEL: Record<ReportLanguage, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  ar: "العربية",
};

/** Document direction for report chrome (Arabic is RTL). */
export function reportLanguageDirection(language: ReportLanguage): "ltr" | "rtl" {
  return language === "ar" ? "rtl" : "ltr";
}

export function isReportLanguage(value: string): value is ReportLanguage {
  return (REPORT_LANGUAGES as readonly string[]).includes(value);
}

export type ReportStrings = {
  canvasTitle: string;
  organisation: string;
  notRecorded: string;
  generated: string;
  sectionsAnswered: string;
  language: string;
  freeTextNotice: string;
  version: string;
  canvasColumns: [string, string, string, string];
  timelineTitle: string;
  cohort: string;
  eventsRecorded: string;
  firstEvent: string;
  latestEvent: string;
  noneRecorded: string;
  trail: string;
  emptyTimeline: string;
  timelineColumns: [string, string, string, string, string, string];
  sections: Record<CanvasSection, string>;
  confidence: Record<CanvasConfidence, string>;
  categories: Record<string, string>;
  documents: string;
  documentColumns: [string, string, string, string, string];
};

const EN: ReportStrings = {
  canvasTitle: "Sovereign Public Value Canvas",
  organisation: "Organisation",
  notRecorded: "not recorded",
  generated: "Generated",
  sectionsAnswered: "sections answered",
  language: "Language",
  freeTextNotice:
    "Report headings are translated; answers are reproduced exactly as recorded and are not translated.",
  version: "Version",
  canvasColumns: ["Section", "Purpose", "Answer", "Evidence"],
  timelineTitle: "Pilot evidence timeline",
  cohort: "Cohort",
  eventsRecorded: "Events recorded",
  firstEvent: "First event",
  latestEvent: "Latest event",
  noneRecorded: "none recorded",
  trail: "Trail",
  emptyTimeline:
    "No pilot events have been recorded yet. Issue seats and the trail starts populating itself.",
  timelineColumns: ["Occurred at", "Category", "Event", "Participant", "Detail", "Actor"],
  sections: {
    mandate: "Service mandate and legitimate public purpose",
    beneficiaries: "Beneficiaries, affected groups and inclusion needs",
    baseline: "Current problem, baseline and whole-service journey",
    outcomes: "Target outcomes, service standards and performance measures",
    ai_versus_alternatives: "Role of AI versus simpler process, policy or technology options",
    authority_and_redress: "Human authority, transparency, contestability and redress",
    sovereignty: "Data, infrastructure, vendor, jurisdiction and capability sovereignty",
  },
  confidence: { unknown: "Not yet known", assumed: "Assumption", evidenced: "Evidenced" },
  categories: {
    seat: "Seat",
    mission: "Mission",
    checkpoint: "Checkpoint",
    admin: "Admin action",
    reminder: "Reminder",
    verdict: "Verdict",
    waiver: "Waiver",
    launch_check: "Launch check",
    document: "Document",
  },
  documents: "Supporting documents",
  documentColumns: ["Section", "File", "Type", "Size", "Attached at"],
};

const FR: ReportStrings = {
  canvasTitle: "Canevas de valeur publique souveraine",
  organisation: "Organisation",
  notRecorded: "non renseigné",
  generated: "Généré le",
  sectionsAnswered: "sections renseignées",
  language: "Langue",
  freeTextNotice:
    "Les intitulés sont traduits ; les réponses sont reproduites telles qu'enregistrées et ne sont pas traduites.",
  version: "Version",
  canvasColumns: ["Section", "Finalité", "Réponse", "Preuve"],
  timelineTitle: "Chronologie des preuves du pilote",
  cohort: "Cohorte",
  eventsRecorded: "Événements enregistrés",
  firstEvent: "Premier événement",
  latestEvent: "Dernier événement",
  noneRecorded: "aucun enregistré",
  trail: "Piste d'audit",
  emptyTimeline:
    "Aucun événement du pilote n'a encore été enregistré. Attribuez des places et la piste se remplit d'elle-même.",
  timelineColumns: ["Date", "Catégorie", "Événement", "Participant", "Détail", "Auteur"],
  sections: {
    mandate: "Mandat de service et finalité publique légitime",
    beneficiaries: "Bénéficiaires, groupes affectés et besoins d'inclusion",
    baseline: "Problème actuel, référence et parcours de service complet",
    outcomes: "Résultats visés, normes de service et indicateurs",
    ai_versus_alternatives:
      "Rôle de l'IA face aux options de processus, de politique ou techniques",
    authority_and_redress: "Autorité humaine, transparence, contestation et recours",
    sovereignty:
      "Souveraineté des données, infrastructures, fournisseurs, juridiction et compétences",
  },
  confidence: { unknown: "Non encore établi", assumed: "Hypothèse", evidenced: "Étayé" },
  categories: {
    seat: "Place",
    mission: "Mission",
    checkpoint: "Point de contrôle",
    admin: "Action administrateur",
    reminder: "Rappel",
    verdict: "Verdict",
    waiver: "Dérogation",
    launch_check: "Contrôle de lancement",
    document: "Document",
  },
  documents: "Documents justificatifs",
  documentColumns: ["Section", "Fichier", "Type", "Taille", "Ajouté le"],
};

const ES: ReportStrings = {
  canvasTitle: "Lienzo de valor público soberano",
  organisation: "Organización",
  notRecorded: "no registrado",
  generated: "Generado el",
  sectionsAnswered: "secciones respondidas",
  language: "Idioma",
  freeTextNotice:
    "Los encabezados están traducidos; las respuestas se reproducen tal como fueron registradas y no se traducen.",
  version: "Versión",
  canvasColumns: ["Sección", "Propósito", "Respuesta", "Evidencia"],
  timelineTitle: "Cronología de evidencias del piloto",
  cohort: "Cohorte",
  eventsRecorded: "Eventos registrados",
  firstEvent: "Primer evento",
  latestEvent: "Último evento",
  noneRecorded: "ninguno registrado",
  trail: "Registro",
  emptyTimeline:
    "Todavía no se ha registrado ningún evento del piloto. Asigne plazas y el registro se irá completando.",
  timelineColumns: ["Fecha", "Categoría", "Evento", "Participante", "Detalle", "Autor"],
  sections: {
    mandate: "Mandato del servicio y finalidad pública legítima",
    beneficiaries: "Beneficiarios, grupos afectados y necesidades de inclusión",
    baseline: "Problema actual, línea base y recorrido completo del servicio",
    outcomes: "Resultados objetivo, estándares de servicio e indicadores",
    ai_versus_alternatives: "Papel de la IA frente a opciones de proceso, política o tecnología",
    authority_and_redress: "Autoridad humana, transparencia, impugnación y reparación",
    sovereignty: "Soberanía de datos, infraestructura, proveedores, jurisdicción y capacidades",
  },
  confidence: { unknown: "Aún no se sabe", assumed: "Supuesto", evidenced: "Con evidencia" },
  categories: {
    seat: "Plaza",
    mission: "Misión",
    checkpoint: "Punto de control",
    admin: "Acción administrativa",
    reminder: "Recordatorio",
    verdict: "Veredicto",
    waiver: "Exención",
    launch_check: "Comprobación de lanzamiento",
    document: "Documento",
  },
  documents: "Documentos de apoyo",
  documentColumns: ["Sección", "Archivo", "Tipo", "Tamaño", "Añadido el"],
};

const DE: ReportStrings = {
  canvasTitle: "Souveränes Public-Value-Canvas",
  organisation: "Organisation",
  notRecorded: "nicht erfasst",
  generated: "Erstellt am",
  sectionsAnswered: "beantwortete Abschnitte",
  language: "Sprache",
  freeTextNotice:
    "Überschriften sind übersetzt; Antworten werden unverändert wiedergegeben und nicht übersetzt.",
  version: "Version",
  canvasColumns: ["Abschnitt", "Zweck", "Antwort", "Nachweis"],
  timelineTitle: "Nachweis-Zeitleiste des Pilotprojekts",
  cohort: "Kohorte",
  eventsRecorded: "Erfasste Ereignisse",
  firstEvent: "Erstes Ereignis",
  latestEvent: "Letztes Ereignis",
  noneRecorded: "keine erfasst",
  trail: "Verlauf",
  emptyTimeline:
    "Es wurden noch keine Pilot-Ereignisse erfasst. Sobald Plätze vergeben sind, füllt sich der Verlauf.",
  timelineColumns: ["Zeitpunkt", "Kategorie", "Ereignis", "Teilnehmende", "Detail", "Akteur"],
  sections: {
    mandate: "Auftrag des Dienstes und legitimer öffentlicher Zweck",
    beneficiaries: "Begünstigte, betroffene Gruppen und Inklusionsbedarf",
    baseline: "Aktuelles Problem, Ausgangswerte und gesamter Serviceweg",
    outcomes: "Zielergebnisse, Servicestandards und Kennzahlen",
    ai_versus_alternatives:
      "Rolle der KI gegenüber einfacheren Prozess-, Politik- oder Technikoptionen",
    authority_and_redress: "Menschliche Entscheidungsbefugnis, Transparenz, Anfechtung und Abhilfe",
    sovereignty: "Souveränität von Daten, Infrastruktur, Anbietern, Jurisdiktion und Kompetenzen",
  },
  confidence: { unknown: "Noch nicht bekannt", assumed: "Annahme", evidenced: "Belegt" },
  categories: {
    seat: "Platz",
    mission: "Mission",
    checkpoint: "Checkpoint",
    admin: "Admin-Aktion",
    reminder: "Erinnerung",
    verdict: "Urteil",
    waiver: "Ausnahme",
    launch_check: "Launch-Prüfung",
    document: "Dokument",
  },
  documents: "Belegdokumente",
  documentColumns: ["Abschnitt", "Datei", "Typ", "Größe", "Angehängt am"],
};

const AR: ReportStrings = {
  canvasTitle: "لوحة القيمة العامة السيادية",
  organisation: "المؤسسة",
  notRecorded: "غير مسجّل",
  generated: "تم الإنشاء",
  sectionsAnswered: "أقسام مكتملة",
  language: "اللغة",
  freeTextNotice: "تُترجم عناوين التقرير فقط؛ تُعاد الإجابات كما سُجّلت دون ترجمة آلية.",
  version: "الإصدار",
  canvasColumns: ["القسم", "الغرض", "الإجابة", "الأدلة"],
  timelineTitle: "الجدول الزمني لأدلة التجربة",
  cohort: "المجموعة",
  eventsRecorded: "أحداث مسجّلة",
  firstEvent: "أول حدث",
  latestEvent: "آخر حدث",
  noneRecorded: "لا شيء مسجّل",
  trail: "مسار التدقيق",
  emptyTimeline: "لم تُسجَّل أحداث للتجربة بعد. عند إصدار المقاعد يبدأ المسار بالامتلاء.",
  timelineColumns: ["الوقت", "الفئة", "الحدث", "المشارك", "التفصيل", "الفاعل"],
  sections: {
    mandate: "تفويض الخدمة والغرض العام المشروع",
    beneficiaries: "المستفيدون والمجموعات المتأثرة واحتياجات الإدماج",
    baseline: "المشكلة الحالية وخط الأساس ومسار الخدمة الكامل",
    outcomes: "النتائج المستهدفة ومعايير الخدمة ومؤشرات الأداء",
    ai_versus_alternatives: "دور الذكاء الاصطناعي مقابل خيارات أبسط للعملية أو السياسة أو التقنية",
    authority_and_redress: "السلطة البشرية والشفافية والقابلية للطعن والإنصاف",
    sovereignty: "سيادة البيانات والبنية التحتية والمورّد والاختصاص والقدرات",
  },
  confidence: { unknown: "غير معروف بعد", assumed: "افتراض", evidenced: "مدعوم بالأدلة" },
  categories: {
    seat: "مقعد",
    mission: "مهمة",
    checkpoint: "نقطة تحقق",
    admin: "إجراء إداري",
    reminder: "تذكير",
    verdict: "حكم",
    waiver: "استثناء",
    launch_check: "فحص الإطلاق",
    document: "مستند",
  },
  documents: "المستندات الداعمة",
  documentColumns: ["القسم", "الملف", "النوع", "الحجم", "أُرفق في"],
};

const STRINGS: Record<ReportLanguage, ReportStrings> = { en: EN, fr: FR, es: ES, de: DE, ar: AR };

export function reportStrings(language: ReportLanguage = "en"): ReportStrings {
  return STRINGS[language] ?? EN;
}

/** Every language must cover every controlled term — asserted by the tests. */
export function missingTranslations(language: ReportLanguage): string[] {
  const strings = reportStrings(language);
  return CANVAS_SECTIONS.filter((section) => !strings.sections[section]?.trim());
}
