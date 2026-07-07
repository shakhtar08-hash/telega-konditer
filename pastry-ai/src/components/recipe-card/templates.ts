export type CardTemplate = "minimal" | "pinterest" | "luxury" | "dark";

export const templateNames: Record<CardTemplate, string> = {
  minimal: "Minimal",
  pinterest: "Pinterest",
  luxury: "Luxury",
  dark: "Dark Premium",
};

const sharedBase = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
.recipe-card { width: 1080px; min-height: 1620px; display: flex; flex-direction: column; }
h1 { font-weight: 700; line-height: 1.15; }
h2 { font-weight: 600; }
li { line-height: 1.5; }
`;

export const minimalCss = `
${sharedBase}
body { background: #FCFBF8; }
.recipe-card {
  background: white;
  border-radius: 40px;
  padding: 70px;
  gap: 32px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.04);
}
h1 { font-size: 56px; color: #1a1a2e; }
.description { font-size: 24px; color: #8a8a9e; line-height: 1.5; margin-top: -12px; }
.hero-block {
  background: #F8F6F3;
  border-radius: 32px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.hero-placeholder {
  width: 100%;
  height: 280px;
  background: linear-gradient(135deg, #F0EBE3 0%, #E8DFD0 100%);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 72px;
}
.meta-row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #F8F6F3;
  padding: 12px 20px;
  border-radius: 14px;
  font-size: 20px;
  color: #1a1a2e;
  font-weight: 500;
}
.meta-item span { font-size: 22px; }
section { display: flex; flex-direction: column; gap: 18px; }
h2 {
  font-size: 34px;
  color: #1a1a2e;
  border-bottom: 2px solid #E8DFD0;
  padding-bottom: 10px;
}
ul, ol { padding-left: 24px; display: flex; flex-direction: column; gap: 8px; }
li { font-size: 24px; color: #2d2d44; }
li::marker { color: #C8A97E; }
.ingredient-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 24px;
  padding: 8px 0;
  border-bottom: 1px solid #F0EBE3;
}
.ingredient-name { color: #2d2d44; }
.ingredient-amount { color: #8B7355; font-weight: 500; white-space: nowrap; margin-left: 16px; }
.step-item { font-size: 24px; color: #2d2d44; padding: 6px 0; }
.tips-section { background: #F8F6F3; border-radius: 20px; padding: 28px 36px; }
.tips-section h2 { border-bottom-color: #E0D8CC; }
.tip-item { font-size: 22px; color: #2d2d44; padding: 4px 0; }
.footer { text-align: center; font-size: 18px; color: #A09DB0; margin-top: auto; padding-top: 20px; border-top: 1px solid #F0EBE3; }
`;

export const pinterestCss = `
${sharedBase}
body { background: #F0EBE3; }
.recipe-card {
  background: white;
  border-radius: 32px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.06);
}
.hero-area {
  height: 680px;
  background: linear-gradient(135deg, #E8DFD0 0%, #D6C9B3 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 120px;
  position: relative;
}
.hero-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: linear-gradient(transparent, rgba(0,0,0,0.15));
}
.card-content {
  padding: 48px 56px 56px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
h1 { font-size: 52px; color: #1a1a2e; margin-bottom: 4px; }
.description { font-size: 22px; color: #8a8a9e; line-height: 1.5; }
.rating { font-size: 28px; letter-spacing: 4px; margin-bottom: 8px; }
.meta-row { display: flex; gap: 24px; flex-wrap: wrap; }
.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #F5F2ED;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 18px;
  color: #1a1a2e;
  font-weight: 500;
}
section { display: flex; flex-direction: column; gap: 16px; }
h2 { font-size: 30px; color: #1a1a2e; }
ul, ol { padding-left: 24px; display: flex; flex-direction: column; gap: 8px; }
li { font-size: 22px; color: #2d2d44; }
.ingredient-row {
  display: flex;
  justify-content: space-between;
  font-size: 22px;
  padding: 6px 0;
}
.ingredient-name { color: #2d2d44; }
.ingredient-amount { color: #8B7355; font-weight: 500; }
.step-item { font-size: 22px; color: #2d2d44; padding: 4px 0; border-bottom: 1px solid #F0EBE3; }
.tips-section { background: #F5F2ED; border-radius: 16px; padding: 24px 32px; }
.tip-item { font-size: 20px; color: #2d2d44; padding: 4px 0; }
.footer { text-align: center; font-size: 16px; color: #A09DB0; margin-top: auto; padding-top: 16px; }
`;

export const luxuryCss = `
${sharedBase}
body { background: #F8F5F0; }
.recipe-card {
  background: #FDFCFA;
  border-radius: 32px;
  padding: 72px;
  gap: 32px;
  border: 1px solid #E8DFD0;
  box-shadow: 0 20px 80px rgba(0,0,0,0.03);
}
h1 { font-family: 'Playfair Display', serif; font-size: 60px; color: #1a1a2e; }
.description { font-family: 'Inter', sans-serif; font-size: 22px; color: #8a8a9e; font-style: italic; line-height: 1.5; margin-top: -8px; }
.hero-block {
  background: #F8F5F0;
  border-radius: 28px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  border: 1px solid #E0D5C5;
}
.hero-placeholder {
  width: 100%;
  height: 260px;
  background: linear-gradient(135deg, #F0EBE3 0%, #E0D5C5 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 72px;
}
.meta-row { display: flex; gap: 20px; flex-wrap: wrap; }
.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #C8A97E;
  padding: 10px 18px;
  border-radius: 100px;
  font-size: 18px;
  color: #8B7355;
  font-weight: 500;
}
section { display: flex; flex-direction: column; gap: 18px; }
h2 {
  font-family: 'Playfair Display', serif;
  font-size: 34px;
  color: #B88A44;
  border-bottom: 1px solid #C8A97E;
  padding-bottom: 8px;
}
ul, ol { padding-left: 24px; display: flex; flex-direction: column; gap: 8px; }
li { font-size: 22px; color: #2d2d44; }
li::marker { color: #B88A44; }
.ingredient-row {
  display: flex;
  justify-content: space-between;
  font-size: 22px;
  padding: 8px 0;
  border-bottom: 1px solid #EDE6DB;
}
.ingredient-name { color: #2d2d44; }
.ingredient-amount { color: #B88A44; font-weight: 500; }
.step-item { font-size: 22px; color: #2d2d44; padding: 6px 0; }
.tips-section { background: #F8F5F0; border-radius: 16px; padding: 28px 36px; }
.tip-item { font-size: 20px; color: #2d2d44; padding: 4px 0; }
.footer { text-align: center; font-size: 16px; color: #A09DB0; margin-top: auto; padding-top: 20px; border-top: 1px solid #EDE6DB; font-style: italic; }
`;

export const darkCss = `
${sharedBase}
body { background: #0D0D0D; }
.recipe-card {
  background: #1A1A1A;
  border-radius: 32px;
  padding: 64px;
  gap: 30px;
  border: 1px solid #2A2A2A;
}
h1 { font-size: 54px; color: #F5F0EB; }
.description { font-size: 22px; color: #8A8A8A; line-height: 1.5; margin-top: -10px; }
.hero-block {
  background: #222222;
  border-radius: 28px;
  padding: 36px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.hero-placeholder {
  width: 100%;
  height: 240px;
  background: linear-gradient(135deg, #2A2A2A 0%, #333333 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
}
.meta-row { display: flex; gap: 20px; flex-wrap: wrap; }
.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #222222;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 18px;
  color: #C8A97E;
  font-weight: 500;
}
section { display: flex; flex-direction: column; gap: 16px; }
h2 { font-size: 32px; color: #C8A97E; border-bottom: 1px solid #2A2A2A; padding-bottom: 8px; }
ul, ol { padding-left: 24px; display: flex; flex-direction: column; gap: 8px; }
li { font-size: 22px; color: #D0D0D0; }
li::marker { color: #C8A97E; }
.ingredient-row {
  display: flex;
  justify-content: space-between;
  font-size: 22px;
  padding: 8px 0;
  border-bottom: 1px solid #2A2A2A;
}
.ingredient-name { color: #D0D0D0; }
.ingredient-amount { color: #C8A97E; font-weight: 500; }
.step-item { font-size: 22px; color: #D0D0D0; padding: 6px 0; }
.tips-section { background: #222222; border-radius: 16px; padding: 24px 32px; }
.tip-item { font-size: 20px; color: #D0D0D0; padding: 4px 0; }
.footer { text-align: center; font-size: 16px; color: #555; margin-top: auto; padding-top: 16px; border-top: 1px solid #2A2A2A; }
`;

export function getTemplateCss(template: CardTemplate): string {
  switch (template) {
    case "minimal": return minimalCss;
    case "pinterest": return pinterestCss;
    case "luxury": return luxuryCss;
    case "dark": return darkCss;
  }
}