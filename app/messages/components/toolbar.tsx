'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeftIcon } from '@/app/messages/icons/arrow-left';
import { ArrowRightIcon } from '@/app/messages/icons/arrow-right';
import { EmailIcon } from '@/app/messages/icons/email';
import { TrashIcon } from '@/app/messages/icons/trash';
import Link from 'next/link';
import { deleteEmail } from '@/app/messages/db/actions';
import { Search } from './search';

type Params = {
  name: string;
};

export function Toolbar() {
  const params: Params = useParams();
  const searchParams = useSearchParams();
  const emailId = searchParams.get('id');

  return (
    <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 py-4 px-2 sticky top-0 h-[60px]">
      <div className="space-x-1">
        <Link
          href={`/f/new`}
          className="inline-flex hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-3 py-2"
        >
          <EmailIcon />
        </Link>
        <form
          className="inline-flex"
          onSubmit={async (e) => {
            e.preventDefault();

            if (emailId) {
              await deleteEmail(params.name, emailId);
            }
          }}
        >
          <button
            type="submit"
            className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-3 py-2"
          >
            <TrashIcon />
          </button>
        </form>
        <button className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-3 py-2">
          <ArrowLeftIcon />
        </button>
        <button className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-3 py-2">
          <ArrowRightIcon />
        </button>
      </div>
      <button className="flex ml-auto">
        <Search />
      </button>
    </div>
  );
}

export function ToolbarSkeleton() {
  return (
    <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 py-4 px-2 sticky top-0 h-[60px]" />
  );
}
