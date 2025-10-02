import Scheduler from "./components/Scheduler";
import "resource-scheduler/dist/resource-scheduler.css";
import logo from "./assets/obaid-code-logo.svg";
import { Analytics } from "@vercel/analytics/next";

const App = () => {
  return (
    <div>
      <Scheduler />
      <Analytics />
      <div className="flex flex-col items-center text-center text-gray-500 text-sm mt-8">
        <img src={logo} alt="obaid-code logo" className="w-16 h-16 mb-2" />
        <span>
          Developed with{" "}
          <span role="img" aria-label="love">
            ❤️
          </span>{" "}
          by{" "}
          <a
            href="https://mohammedobaid.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-900 transition-colors"
          >
            obaid-code
          </a>
        </span>
      </div>
    </div>
  );
};

export default App;
