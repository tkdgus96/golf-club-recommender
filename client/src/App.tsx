import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";

const Home = lazy(() => import("./pages/Home"));
const Quiz = lazy(() => import("./pages/Quiz"));
const Catalog = lazy(() => import("./pages/Catalog"));
const ClubDetail = lazy(() => import("./pages/ClubDetail"));
const Results = lazy(() => import("./pages/Results"));
const ShaftFitting = lazy(() => import("./pages/ShaftFitting"));
const ShaftDetail = lazy(() => import("./pages/ShaftDetail"));
const Simulator = lazy(() => import("./pages/Simulator"));
const ShaftCompare = lazy(() => import("./pages/ShaftCompare"));
const MyFits = lazy(() => import("./pages/MyFits"));
const CoachWorkspace = lazy(() => import("./pages/CoachWorkspace"));
const DataPrivacy = lazy(() => import("./pages/DataPrivacy"));
const ReportView = lazy(() => import("./pages/ReportView"));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="quiz" element={<Quiz />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="clubs/:id" element={<ClubDetail />} />
            <Route path="results" element={<Results />} />
            <Route path="shafts" element={<ShaftFitting />} />
            <Route path="shafts/:id" element={<ShaftDetail />} />
            <Route path="simulator" element={<Simulator />} />
            <Route path="compare" element={<ShaftCompare />} />
            <Route path="my-fits" element={<MyFits />} />
            <Route path="coach" element={<CoachWorkspace />} />
            <Route path="privacy" element={<DataPrivacy />} />
            <Route path="report/:reportId" element={<ReportView />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
