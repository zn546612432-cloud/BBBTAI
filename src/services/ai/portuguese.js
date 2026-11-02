// Lightweight language identification for optional in-world subtitles.
// Avoid treating English greetings, JSON or ordinary Latin product names as Portuguese.
const lexemes=/\b(?:olá|obrigad[oa]|desculpa|saudade|saudades|pois|estou|estás|sabes|também|então|claro|meu|minha|querido|querida|não|sim|a sério|está bem|bom dia|boa noite|tenho|quero|gosto|estou aqui)\b/iu;
export function containsPortuguese(text){
 const s=String(text||'');
 return lexemes.test(s)||/[ãõçáéíóúâêôà]/iu.test(s)&&/\b[a-zà-ú]{3,}\b/iu.test(s);
}
export function safeTaiTranslation(text,translation){
 const normalized=String(translation||'').trim().slice(0,600);
 if(!containsPortuguese(text)||!/[\u3400-\u9fff]/u.test(normalized)||normalized===String(text).trim())return '';
 return normalized;
}
