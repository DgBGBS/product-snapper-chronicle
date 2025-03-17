import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("No root element found. Ensure there is a div with id='root' in your index.html");
}

createRoot(rootElement).render(<App />);
