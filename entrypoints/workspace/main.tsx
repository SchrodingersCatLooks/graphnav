import { createRoot } from 'react-dom/client';
import { GraphEditor } from '../../components/editor/GraphEditor';
import './style.css';

createRoot(document.getElementById('root')!).render(<GraphEditor />);
