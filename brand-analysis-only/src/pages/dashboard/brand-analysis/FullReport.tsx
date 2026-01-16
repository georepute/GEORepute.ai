import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { FullAnalysisReport } from "@/components/brand-analysis/FullAnalysisReport";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { useBrandAnalysisProject } from "@/hooks/useBrandAnalysisProjects";

export default function FullReport() {
  const { id } = useParams<{ id: string }>();
  const { data: project } = useBrandAnalysisProject(id!);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // This will be handled by the FullAnalysisReport component
    const downloadEvent = new CustomEvent('downloadPDF');
    window.dispatchEvent(downloadEvent);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="w-fit">
              <Link to={`/dashboard/brand-analysis/project/${id}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">Full Analysis Report</h1>
              <p className="text-muted-foreground text-sm md:text-base">
                {project?.brand_name} • Brand Visibility Report
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="w-full sm:w-auto">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Navigation Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to="/dashboard/brand-analysis" className="hover:text-foreground">
            Brand Visibility
          </Link>
          <span>/</span>
          <Link to={`/dashboard/brand-analysis/project/${id}`} className="hover:text-foreground truncate">
            {project?.brand_name}
          </Link>
          <span>/</span>
          <span className="text-foreground">Full Report</span>
        </div>

        {/* Full Report Component */}
        {project && (
          <div className="print:shadow-none">
            <FullAnalysisReport project={project} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}