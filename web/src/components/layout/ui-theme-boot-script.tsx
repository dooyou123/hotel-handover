export function UiThemeBootScript() {
  const script = `document.documentElement.dataset.ui='project';`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
