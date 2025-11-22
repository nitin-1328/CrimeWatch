import Navbar from "../components/Navbar";

export default function Dashboard() {
  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-900 text-gray-200 px-6 py-10">

        {/* Page Heading */}
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">CrimeWatch Dashboard</h1>
          <p className="text-gray-400">
            Monitor crime-prone areas, view heatmaps, get safe routes, and report incidents.
          </p>
        </div>

        {/* Grid Cards */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">

          {/* Heatmap Card */}
          <a
            href="/heatmap"
            className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-lg hover:bg-gray-700/60 hover:border-green-500 transition group"
          >
            <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-green-400 transition">
              Crime Heatmap
            </h2>
            <p className="text-gray-400 text-sm">
              Visualize areas with high crime intensity using real-time heat data.
            </p>
          </a>

          {/* Safe Route Card */}
          <a
            href="/saferoute"
            className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-lg hover:bg-gray-700/60 hover:border-blue-500 transition group"
          >
            <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition">
              Safe Route Finder
            </h2>
            <p className="text-gray-400 text-sm">
              Find the safest path between two locations using crime-aware routing.
            </p>
          </a>

          {/* Report Card */}
          <a
            href="/report"
            className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-lg hover:bg-gray-700/60 hover:border-yellow-500 transition group"
          >
            <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-yellow-400 transition">
              Report Incident
            </h2>
            <p className="text-gray-400 text-sm">
              Help the community stay safe by reporting suspicious or criminal activity.
            </p>
          </a>

          {/* Crime Alerts */}
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-3">Live Crime Alerts</h2>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li className="bg-gray-700 p-2 rounded">🔴 High activity reported in Mumbai</li>
              <li className="bg-gray-700 p-2 rounded">🟠 Suspicious activity in Delhi area</li>
              <li className="bg-gray-700 p-2 rounded">🟢 Low risk zone in Bengaluru</li>
            </ul>
          </div>

          {/* Stats */}
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-lg col-span-1 sm:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-4">Quick Stats</h2>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-gray-700 rounded-lg">
                <p className="text-3xl font-bold text-green-400">23</p>
                <p className="text-gray-400 text-sm">High Crime Zones</p>
              </div>

              <div className="p-4 bg-gray-700 rounded-lg">
                <p className="text-3xl font-bold text-yellow-400">48</p>
                <p className="text-gray-400 text-sm">Medium Zones</p>
              </div>

              <div className="p-4 bg-gray-700 rounded-lg">
                <p className="text-3xl font-bold text-blue-400">67</p>
                <p className="text-gray-400 text-sm">Low Risk Zones</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
