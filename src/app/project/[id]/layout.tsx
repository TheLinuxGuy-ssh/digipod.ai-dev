import EmailSidebar from '../../../components/EmailSidebar';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <EmailSidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  );
} 