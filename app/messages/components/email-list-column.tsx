import Link from 'next/link';
import { formatEmailString, removeSpacesFromFolderName } from '@/app/messages/db/utils';
import { getEmailsForFolder } from '@/app/messages/db/queries';

export async function EmailListColumn({
  folderName,
  searchParams,
}: {
  folderName: string;
  searchParams: { q?: string; id?: string };
}) {
  const emails = await getEmailsForFolder(folderName, searchParams.q);

  function createUrl(id: string) {
    const baseUrl = `/f/${removeSpacesFromFolderName(folderName)}`;
    const params = new URLSearchParams(searchParams);
    params.set('id', id);
    return `${baseUrl}?${params}`;
  }

  return (
    <div className="border-r border-gray-200 dark:border-gray-800 overflow-y-auto p-2 col-span-2">
      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {emails.map((email) => (
          <Link key={email.id} href={createUrl(email.id)}>
            <li className="p-4 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex justify-between items-start rounded-lg">
              <div className="w-full truncate">
                <h2 className="text-base font-bold">
                  {formatEmailString({
                    first_name: email.first_name,
                    last_name: email.last_name,
                    email: email.email,
                  })}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {email.subject}
                </p>
                <p className="text-sm truncate overflow-ellipsis">
                  {email.body}
                </p>
              </div>
              <time className="text-xs text-gray-500 dark:text-gray-400 self-center flex justify-end">
                {new Date(email.sent_date).toLocaleDateString()}
              </time>
            </li>
          </Link>
        ))}
      </ul>
    </div>
  );
}
