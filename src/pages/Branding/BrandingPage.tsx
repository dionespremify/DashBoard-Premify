import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import BrandingForm from "../../components/branding/BrandingForm";

export default function BrandingPage() {
  return (
    <>
      <PageMeta title="Personalização | Premify" description="Customize o visual do seu site white-label." />
      <PageBreadcrumb pageTitle="Personalização" />

      <div className="max-w-3xl mx-auto">
        <BrandingForm />
      </div>
    </>
  );
}
