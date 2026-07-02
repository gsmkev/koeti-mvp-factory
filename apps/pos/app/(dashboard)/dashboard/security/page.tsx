'use client';

import { Input } from '@koeti/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@koeti/ui';
import { Label, PageHeader, SubmitButton } from '@koeti/ui';
import { Lock, Trash2 } from 'lucide-react';
import { useActionState } from 'react';
import { updatePassword, deleteAccount } from '@/app/(login)/actions';

type PasswordState = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  error?: string;
  success?: string;
};

type DeleteState = {
  password?: string;
  error?: string;
  success?: string;
};

export default function SecurityPage() {
  const [passwordState, passwordAction] = useActionState<
    PasswordState,
    FormData
  >(updatePassword, {});

  const [deleteState, deleteAction] = useActionState<DeleteState, FormData>(
    deleteAccount,
    {}
  );

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader title="Security Settings" />
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={passwordAction}>
            <div>
              <Label htmlFor="current-password" className="mb-2">
                Current Password
              </Label>
              <Input
                id="current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={passwordState.currentPassword}
              />
            </div>
            <div>
              <Label htmlFor="new-password" className="mb-2">
                New Password
              </Label>
              <Input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={passwordState.newPassword}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="mb-2">
                Confirm New Password
              </Label>
              <Input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={passwordState.confirmPassword}
              />
            </div>
            {passwordState.error && (
              <p className="text-red-500 text-sm">{passwordState.error}</p>
            )}
            {passwordState.success && (
              <p className="text-green-500 text-sm">{passwordState.success}</p>
            )}
            <SubmitButton
              className="bg-orange-500 hover:bg-orange-600 text-white"
              pendingText="Updating..."
            >
              <Lock className="mr-2 h-4 w-4" />
              Update Password
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Account deletion is non-reversable. Please proceed with caution.
          </p>
          <form action={deleteAction} className="space-y-4">
            <div>
              <Label htmlFor="delete-password" className="mb-2">
                Confirm Password
              </Label>
              <Input
                id="delete-password"
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={deleteState.password}
              />
            </div>
            {deleteState.error && (
              <p className="text-red-500 text-sm">{deleteState.error}</p>
            )}
            <SubmitButton
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              pendingText="Deleting..."
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
