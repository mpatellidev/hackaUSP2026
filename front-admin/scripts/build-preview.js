const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const template=fs.readFileSync(path.join(process.env.USERPROFILE,'.codex/skills/frontend-design/assets/preview-template.html'),'utf8');
const output='.frontend-design/uhealth-admin/2026-11-07-uhealth-admin.html';
const source=fs.readFileSync('app.js','utf8');
const context={document:{getElementById:()=>null},console};
vm.createContext(context);
vm.runInContext(source+`;const captureRoot={innerHTML:'',addEventListener(){}};mountUHealth(captureRoot,{review:true});globalThis.markup=captureRoot.innerHTML;`,context);
let ui=context.markup.replace(/<dialog[\s\S]*?<\/dialog>/,'').replace(/<a class="skip"[\s\S]*?<\/a>/,'');
// Review mirrors are intentionally static: preserve annotations and text edits while reviewing.
ui=ui.replace(/<button([^>]*class="patient-name"[^>]*)>/g,'<span$1>').replace(/(Ana Martins|João Pereira|Maria Silva|Carla Ribeiro|Pedro Lima|Beatriz Costa|Lucas Almeida)<\/button>/g,'$1</span>');
let scaffoldCSS=template.match(/<style>([\s\S]*?)<\/style>/)[1];
// Keep shell, controls, pane mechanics, direct editing, picker, comments and export.
scaffoldCSS=scaffoldCSS.slice(scaffoldCSS.indexOf('  * { box-sizing'));
const sampleStart=scaffoldCSS.indexOf('  .wb-header');
const sampleEnd=scaffoldCSS.indexOf('  /* Direct edits */');
if(sampleStart!==-1)scaffoldCSS=scaffoldCSS.slice(0,sampleStart)+scaffoldCSS.slice(sampleEnd);
let before=template.slice(template.indexOf('<div class="app">'),template.indexOf('    <section class="preview-pair"'));
before=before.replace('frontend-design preview','UHealth · Revisão do painel').replace('Decision controls on the left · live preview on the right · click <strong>Comment Mode</strong> to annotate any element','Ajuste os tokens, edite os textos e comente os elementos. Exporte o feedback para aplicar ao projeto.');
before=before.replace(/<div class="help-banner">[\s\S]*?<\/div>/,'<div class="help-banner">Ajuste a identidade UHealth abaixo. Clique em um texto para editá-lo. Use <strong>Comentar</strong> para marcar um elemento. Os dois temas compartilham os ajustes.</div>');
const overlays=template.slice(template.indexOf('<!-- Markers layer -->'),template.indexOf('<script>'));
let script=template.slice(template.indexOf('<script>')+8,template.lastIndexOf('</script>'));
const meta={source:output,topic:'uhealth-admin',targetFile:'styles.css'};
const tokens={

 identidade:[{key:'--uh-brand',intent:'Ação principal',kind:'color',options:[{id:'Operacional',light:'#116b65',dark:'#73c7bd',note:'Verde da interface (default)'},{id:'Discreto',light:'#285e59',dark:'#a4cbc3',note:'Verde menos saturado'}]}],
 leitura:[{key:'--uh-font-family',intent:'Fonte da interface',kind:'dropdown',defaultId:'Sistema',options:[{id:'Sistema',value:'"Segoe UI", Arial, sans-serif',note:'Fonte nativa (default)'},{id:'Arial',value:'Arial, sans-serif',note:'Alternativa tradicional'}]},{key:'--uh-text-size',intent:'Texto das tabelas',kind:'slider',min:13,max:18,step:1,defaultValue:14,unit:'px'},{key:'--uh-row-space',intent:'Espaçamento das linhas',kind:'segmented',defaultId:'Padrão',options:[{id:'Compacto',value:'9px'},{id:'Padrão',value:'12px'},{id:'Amplo',value:'16px'}]}],
 forma:[{key:'--uh-radius-card',intent:'Cantos dos painéis',kind:'slider',min:0,max:12,step:2,defaultValue:6,unit:'px'},{key:'--uh-radius-control',intent:'Cantos dos controles',kind:'slider',min:0,max:8,step:1,defaultValue:4,unit:'px'}]
};
script=script.replace(/const PREVIEW_META = [\s\S]*?const decisions = \{\};/,`const PREVIEW_META=${JSON.stringify(meta)};\nconst TOKENS=${JSON.stringify(tokens)};\nconst SECTION_ORDER=[['Identidade UHealth','identidade'],['Leitura da fila','leitura'],['Forma dos componentes','forma']];\nconst decisions={};`);
const translate={'Exit Comment Mode':'Sair dos comentários','Comment Mode':'Comentar','Show Markers':'Mostrar marcações','Hide Markers':'Ocultar marcações','Export to markdown':'Exportar feedback','Comments':'Comentários','Reset':'Restaurar','Collapse':'Recolher','This element':'Este elemento','All matching':'Todos iguais','All like this':'Todos semelhantes','Global':'Global','No comments yet. Click':'Nenhum comentário. Clique em','in the header, then click any element in the preview to annotate.':'no cabeçalho e depois em um elemento da prévia.','What change do you want here?':'O que você quer mudar aqui?','Scope':'Escopo','↑ Parent':'↑ Pai','↓ Child':'↓ Filho','Cancel':'Cancelar','Delete':'Excluir','Save':'Salvar','Copy':'Copiar','Close':'Fechar','Nothing to export — change a decision, edit text, or add a comment first':'Nada para exportar. Altere um ajuste, edite um texto ou comente primeiro.','Copied to clipboard':'Feedback copiado','Note is empty':'Escreva um comentário'};
for(const [a,b] of Object.entries(translate)){before=before.replaceAll(a,b);script=script.replaceAll(a,b)}
// Preserve the round-trip export contract (English section headings and scope IDs).
script=script.replace("lines.push('### Escopo')","lines.push('### Scope')");
script=script.replace("lines.push('- Escopo: '","lines.push('- Scope: '");
script=script.replace("new Date().toISOString().slice(0, 19).replace('T', ' ')","new Date().toLocaleString('sv-SE', {timeZone:'America/Sao_Paulo'})");
script=script.replace("document.execCommand('copy'); document.body.removeChild(ta);", "try { if (document.execCommand) document.execCommand('copy'); } catch {} document.body.removeChild(ta);");
let translatedOverlays=overlays;
for(const [a,b] of Object.entries(translate))translatedOverlays=translatedOverlays.replaceAll(a,b);
const pane=(theme,label)=>`<div class="preview theme-${theme}" id="preview-${theme}" data-theme="${theme}"><button class="pane-toggle-btn" type="button" data-pane="${theme}" aria-label="Expandir tema ${label}">${theme==='light'?'▶':'◀'}</button><div class="review-label">${label}</div><div class="review-canvas">${ui.replaceAll('id="clinic-selector"','id="clinic-selector-'+theme+'"').replaceAll('for="clinic-selector"','for="clinic-selector-'+theme+'"').replaceAll('id="main-content"','id="main-content-'+theme+'"')}</div></div>`;
const css=fs.readFileSync('styles.css','utf8');
const overrides=`:root{--font-stack:"Segoe UI",Arial,sans-serif}.app-header{font-family:var(--font-stack)}.preview{padding:0;min-width:0;background:var(--uh-bg);color:var(--uh-text);container-type:inline-size;--surface-page:var(--uh-bg);--surface-panel:var(--uh-surface);--border-subtle:var(--uh-border);--text-primary:var(--uh-text);--text-muted:var(--uh-muted);--accent-primary:var(--uh-link)}.review-label{font:11px var(--font-stack);padding:12px 16px;background:var(--uh-surface);color:var(--uh-muted);border-bottom:1px solid var(--uh-border)}.preview.theme-dark .review-label{padding-left:48px}.review-canvas{font:var(--uh-text-size)/1.5 var(--uh-font-family);overflow:auto}.review-canvas .shell{min-width:1280px;min-height:850px;grid-template-columns:216px minmax(0,1fr)}.review-canvas .sidebar{position:relative;height:auto}.review-canvas .split{grid-template-columns:minmax(0,1fr) 292px;gap:18px}.review-canvas .profile{display:block}.review-canvas .top-actions .demo-label{max-width:none}.review-canvas .clinic-switch label{display:inline}.review-canvas .clinic-switch select{width:290px}.review-canvas .content{padding:26px 24px 20px}.review-canvas .topbar{padding:10px 24px}.review-canvas .mobile-menu{display:none}.review-canvas .service-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.review-canvas .badge{font-size:12px}.preview-grid{align-items:stretch;overflow:hidden}.main-layout{grid-template-columns:270px 1fr}.main-layout.controls-collapsed{grid-template-columns:56px 1fr}button.btn.primary,button.btn.toggled{background:#116b65;border-color:#116b65}.preview .pane-toggle-btn{top:6px}.preview h1{font-size:26px}.review-canvas .button{pointer-events:none}.review-canvas .nav-item,.review-canvas select{pointer-events:none}.preview [data-fd-editable]:focus{background:var(--uh-soft)}@media(max-width:900px){.app-header{flex-wrap:wrap}.app-header .actions{flex-wrap:wrap}.main-layout{grid-template-columns:230px 1fr}}`;
script += `
// Fit both review mirrors without changing application geometry.
document.querySelectorAll('.preview').forEach(pane=>{const canvas=pane.querySelector('.review-canvas');const fit=()=>{if(pane.clientWidth>80)canvas.style.zoom=String(Math.min(1,pane.clientWidth/1280));};new ResizeObserver(fit).observe(pane);fit();});`;
const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UHealth · Revisão de design</title><style>${scaffoldCSS}</style><style>${css}</style><style>${overrides}</style></head><body>${before}<section class="preview-pair" id="preview-pair"><div class="preview-grid">${pane('light','Tema claro')}${pane('dark','Tema escuro')}</div></section></div></div>${translatedOverlays}<script>${script}</script></body></html>`;
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html.replace(/[ \t]+$/gm,''));
fs.writeFileSync('uhealth-admin.html',`<!doctype html><html lang="pt-BR" class="theme-light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UHealth · Painel da clínica</title><style>${css}</style></head><body><div id="app"></div><script>${source}</script></body></html>`);
console.log('Gerados: '+output+' e uhealth-admin.html');
