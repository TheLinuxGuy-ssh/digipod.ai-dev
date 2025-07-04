import EmailSidebar from '../../../components/EmailSidebar';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="fixed top-0 left-0 h-screen z-40">
        <EmailSidebar />
      </div>
      <div className="ml-72 flex-1 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  );
} 