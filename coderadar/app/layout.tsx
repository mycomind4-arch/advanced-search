import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'CodeRadar · Find the code. See the possibility.',description:'An evidence-first GitHub discovery engine and evolution workbench.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
