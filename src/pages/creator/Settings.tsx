import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { getCreatorProfile } from "@/lib/supabase/queries";
import { updateCreatorBankAccount } from "@/lib/supabase/mutations";
import { verifyBankAccount, getBanks, type Bank } from "@/lib/paystack";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { GetServerSideProps } from "next";

// Force dynamic rendering to prevent static generation
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
};

const bankAccountSchema = z.object({
  bank_account_name: z.string().min(2, 'Account name is required'),
  bank_account_number: z.string().regex(/^\d{10}$/, 'Account number must be 10 digits'),
  bank_name: z.string().min(2, 'Bank name is required'),
  bank_code: z.string().min(3, 'Bank code is required'),
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;

const Settings = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifiedAccountName, setVerifiedAccountName] = useState<string | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);

  const { data: creatorProfile, isLoading } = useQuery({
    queryKey: ['creator-profile', profile?.id],
    queryFn: () => getCreatorProfile(profile!.id),
    enabled: !!profile?.id,
  });

  // Fetch banks from Paystack
  useEffect(() => {
    const fetchBanks = async () => {
      setBanksLoading(true);
      setError(null);
      try {
        const banksList = await getBanks();
        console.log('Fetched banks:', banksList);
        if (banksList && banksList.length > 0) {
          setBanks(banksList);
        } else {
          console.warn('No banks returned from API');
          setError('No banks available. The Edge Function may not be deployed yet.');
        }
      } catch (err: any) {
        console.error('Failed to fetch banks:', err);
        const errorMsg = err.message || 'Failed to load banks';
        setError(errorMsg);
        // Don't set error state if it's just that the function isn't deployed
        // The error message will be shown in the UI
      } finally {
        setBanksLoading(false);
      }
    };

    fetchBanks();
  }, []);

  const mutation = useMutation({
    mutationFn: (data: BankAccountFormData & { is_bank_verified?: boolean }) => 
      updateCreatorBankAccount(profile!.id, {
        bank_account_name: data.bank_account_name,
        bank_account_number: data.bank_account_number,
        bank_name: data.bank_name,
        bank_code: data.bank_code,
        is_bank_verified: data.is_bank_verified,
      }),
    onSuccess: () => {
      setSuccess(true);
      setError(null);
      setVerifying(false);
      setVerifiedAccountName(null);
      queryClient.invalidateQueries({ queryKey: ['creator-profile', profile?.id] });
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to update bank account');
      setSuccess(false);
      setVerifying(false);
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      bank_account_name: creatorProfile?.bank_account_name || '',
      bank_account_number: creatorProfile?.bank_account_number || '',
      bank_name: creatorProfile?.bank_name || '',
      bank_code: creatorProfile?.bank_code || '',
    },
  });

  // Update form when profile loads
  useEffect(() => {
    if (creatorProfile) {
      reset({
        bank_account_name: creatorProfile.bank_account_name || '',
        bank_account_number: creatorProfile.bank_account_number || '',
        bank_name: creatorProfile.bank_name || '',
        bank_code: creatorProfile.bank_code || '',
      });
    }
  }, [creatorProfile, reset]);

  // Auto-fill bank code when bank is selected
  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedBank = banks.find(bank => bank.name === e.target.value);
    if (selectedBank) {
      const currentValues = {
        bank_account_name: creatorProfile?.bank_account_name || '',
        bank_account_number: creatorProfile?.bank_account_number || '',
        bank_name: selectedBank.name,
        bank_code: selectedBank.code,
      };
      reset(currentValues, { keepValues: true });
    }
  };

  const handleVerify = async () => {
    const formData = {
      bank_account_name: creatorProfile?.bank_account_name || '',
      bank_account_number: creatorProfile?.bank_account_number || '',
      bank_name: creatorProfile?.bank_name || '',
      bank_code: creatorProfile?.bank_code || '',
    };

    if (!formData.bank_code || !formData.bank_account_number) {
      setError('Please fill in bank code and account number first');
      return;
    }

    setVerifying(true);
    setError(null);
    setVerifiedAccountName(null);

    try {
      const result = await verifyBankAccount({
        account_number: formData.bank_account_number,
        bank_code: formData.bank_code,
      });

      if (result.verified && result.account_name) {
        setVerifiedAccountName(result.account_name);
        // Auto-fill the account name if it matches
        if (formData.bank_account_name && 
            formData.bank_account_name.toLowerCase() !== result.account_name.toLowerCase()) {
          setError(`Account name mismatch. Expected: ${result.account_name}`);
        } else {
          // Update form with verified account name
          reset({
            ...formData,
            bank_account_name: result.account_name,
          });
        }
      } else {
        setError(result.error || 'Account verification failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify account');
    } finally {
      setVerifying(false);
    }
  };

  const onSubmit = async (data: BankAccountFormData) => {
    // Verify account before saving
    setVerifying(true);
    setError(null);

    try {
      const verifyResult = await verifyBankAccount({
        account_number: data.bank_account_number,
        bank_code: data.bank_code,
      });

      if (!verifyResult.verified) {
        setError(verifyResult.error || 'Account verification failed. Please check your details.');
        setVerifying(false);
        return;
      }

      // Check if account name matches
      if (verifyResult.account_name && 
          verifyResult.account_name.toLowerCase() !== data.bank_account_name.toLowerCase()) {
        setError(`Account name mismatch. The account name should be: ${verifyResult.account_name}`);
        setVerifying(false);
        return;
      }

      // If verified, save with verified status
      mutation.mutate({
        ...data,
        is_bank_verified: true,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to verify account');
      setVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your account and payout details</p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-1">Bank Account Details</h3>
          <p className="text-sm text-muted-foreground">
            Add your bank account details to receive payouts from ticket sales
          </p>
        </div>

        {creatorProfile?.is_bank_verified && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Bank account verified</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm">Bank account details updated successfully!</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {verifiedAccountName && (
          <div className="flex items-center gap-2 p-3 bg-blue-500/10 text-blue-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm">
              Account verified: <strong>{verifiedAccountName}</strong>
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="bank_name">Bank Name</Label>
            {banksLoading ? (
              <div className="mt-2 w-full px-3 py-2 rounded-lg border border-border bg-muted animate-pulse">
                Loading banks...
              </div>
            ) : banks.length === 0 ? (
              <div className="mt-2 w-full px-3 py-2 rounded-lg border border-border bg-muted text-muted-foreground">
                No banks available. {error ? error : 'Please check your connection.'}
              </div>
            ) : (
              <select
                id="bank_name"
                {...register('bank_name')}
                onChange={(e) => {
                  register('bank_name').onChange(e);
                  handleBankChange(e);
                }}
                className="mt-2 w-full px-3 py-2 rounded-lg border border-border bg-background"
              >
                <option value="">Select a bank</option>
                {banks.map((bank) => (
                  <option key={bank.code} value={bank.name}>
                    {bank.name}
                  </option>
                ))}
              </select>
            )}
            {errors.bank_name && (
              <p className="text-sm text-destructive mt-1">{errors.bank_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="bank_code">Bank Code</Label>
            <Input
              id="bank_code"
              type="text"
              placeholder="Bank code (auto-filled)"
              {...register('bank_code')}
              readOnly
              className="mt-2"
            />
            {errors.bank_code && (
              <p className="text-sm text-destructive mt-1">{errors.bank_code.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="bank_account_name">Account Name</Label>
            <Input
              id="bank_account_name"
              type="text"
              placeholder="John Doe"
              {...register('bank_account_name')}
              className="mt-2"
            />
            {errors.bank_account_name && (
              <p className="text-sm text-destructive mt-1">{errors.bank_account_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="bank_account_number">Account Number</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="bank_account_number"
                type="text"
                placeholder="1234567890"
                maxLength={10}
                {...register('bank_account_number')}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleVerify}
                disabled={verifying || !watch('bank_code') || !watch('bank_account_number')}
                className="gap-2"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>
            </div>
            {errors.bank_account_number && (
              <p className="text-sm text-destructive mt-1">{errors.bank_account_number.message}</p>
            )}
          </div>

          <Button 
            type="submit" 
            variant="hero" 
            disabled={mutation.isPending || verifying} 
            className="w-full"
          >
            {mutation.isPending ? 'Saving...' : 'Save Bank Details'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Settings;

