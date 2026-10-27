import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="relative max-w-md w-full rounded-2xl border border-border bg-card shadow-paper px-6 sm:px-10 pt-10 pb-8 text-center">
        <span aria-hidden className="washi-tape" />
        <p className="font-hand text-3xl text-secondary -rotate-2">oops! ✎</p>
        <h1 className="font-display text-2xl font-extrabold text-foreground mt-2">
          This page wandered off the path
        </h1>
        <div className="dotted-divider my-4" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          The worksheet you're after may have moved. Every printable lives in the gallery.
        </p>
        <Link
          to="/"
          className="inline-block mt-5 rounded-full bg-primary text-primary-foreground font-display font-bold px-6 py-2.5 shadow-paper hover:-translate-y-0.5 transition-transform"
        >
          Back to the worksheets
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
