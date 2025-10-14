// Header.tsx
import CalenderIcon from "./CalenderIcon";
import npmIcon from "../assets/npm-icon.svg";

const Header = () => {
  return (
    <header className="mb-10 flex flex-col items-center text-center">
      <div className="flex items-center gap-3 mb-3">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full">
          <CalenderIcon />
        </span>
        <span className="text-xs uppercase tracking-widest font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
          v1.0
        </span>
      </div>
      <h1 className="text-4xl font-extrabold text-gray-900 mb-3 drop-shadow-sm">
        Resource Scheduler Demo
      </h1>
      <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-4">
        A <span className="font-semibold text-blue-600">responsive</span>{" "}
        resource scheduling component for React applications.
        <br />
        <span className="inline-block mt-2 text-sm text-gray-500">
          Drag, drop, and manage events with ease.
        </span>
      </p>
      <div className="flex flex-wrap gap-3 justify-center mt-2">
        <a
          href="https://github.com/mdobaid311/resource-scheduler"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 bg-[#24292f] text-white rounded-lg font-medium shadow hover:bg-[#1b1f23] transition"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.73 1.27 3.4.97.11-.76.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98.01 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.7.42.36.79 1.09.79 2.2 0 1.59-.01 2.87-.01 3.26 0 .31.21.68.8.56C20.71 21.39 24 17.08 24 12c0-6.27-5.23-11.5-12-11.5z" />
          </svg>
          GitHub
        </a>
        <a
          href="https://www.npmjs.com/package/resource-scheduler"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 bg-white border border-blue-600 text-blue-600 rounded-lg font-medium shadow hover:bg-blue-50 transition"
        >
          <img src={npmIcon} alt="NPM" className="w-5 h-5 mr-2" />
          NPM
        </a>
      </div>
    </header>
  );
};

export default Header;