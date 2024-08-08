import { EmailInputCombobox } from '@/app/messages/components/email-combobox';
import { sendEmail } from '@/app/messages/db/actions';
import { getAllEmailAddresses } from '@/app/messages/db/queries';
import { SendIcon } from '@/app/messages/icons/send';
import { EmailBody } from './email-body';
import { FolderColumn } from '@/app/messages/components/folder-column';
import { auth, EnrichedSession } from '@/auth';

export default function Page() {
  return (
    <div className="grid grid-cols-6 gap-2 h-screen p-2">
      <FolderColumn isCollapsed={false} links={[]} id={''} name={''} email_count={''} />
      <Compose />
    </div>
  );
}

async function Compose() {
  const session = (await auth()) as EnrichedSession;
  
  const userEmails = await getAllEmailAddresses();

  return (
    <form className="col-span-5 flex flex-col w-12/20" action={sendEmail}>
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 p-2 sticky top-0 h-[60px]">
        <button
          className="flex ml-auto hover:bg-gray-200 dark:hover:bg-gray-800 rounded px-3 py-2"
          type="submit"
        >
          <SendIcon />
        </button>
      </div>
      <div className="p-1 space-y-1 flex-grow overflow-y-auto text-sm">
        <div className="relative flex flex-col justify-center space-y-2">
          <EmailInputCombobox userEmails={userEmails} />
        </div>
        <hr className="border-t border-gray-200 dark:border-gray-800" />
        <div className="relative flex flex-col space-y-2">
          <label className="absolute left-3 top-4 text-gray-500 dark:text-gray-400">
            From:
          </label>
          <p className="pl-14 border-none bg-white dark:bg-gray-950 text-black dark:text-white px-3 py-2 focus:outline-none">
            {session?.user?.email}
          </p>
        </div>
        <hr className="border-t border-gray-200 dark:border-gray-800" />
        <div className="relative flex flex-col space-y-2">
          <label
            className="absolute left-3 top-4 text-gray-500 dark:text-gray-400"
            htmlFor="subject"
          >
            Subject:
          </label>
          <input
            className="pl-[72px] border-none bg-white dark:bg-gray-950 text-black dark:text-white px-3 py-2 focus:outline-none"
            id="subject"
            type="text"
            name="subject"
            required
          />
        </div>
        <hr className="border-t border-gray-200 dark:border-gray-800" />
        <EmailBody />
      </div>
    </form>
  );
}
