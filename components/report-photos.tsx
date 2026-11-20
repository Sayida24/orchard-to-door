import { Photo } from "@/components/photo";

/** The photos a customer attached to a problem report. Each opens full size in a new tab. */
export function ReportPhotos({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Photos from the customer">
      {urls.map((url, i) => (
        <li key={url}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-xl border border-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-700"
          >
            <Photo src={url} alt={`Photo ${i + 1} from the customer (opens full size)`} className="h-24 w-24 object-cover" />
          </a>
        </li>
      ))}
    </ul>
  );
}
