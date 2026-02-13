'use client'

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import { getCreatorProfile } from "@/lib/supabase/queries";
import { updateCreatorBankAccount, updateUserProfile } from "@/lib/supabase/mutations";
import { verifyBankAccount, getBanks, type Bank } from "@/lib/paystack";
import { CheckCircle2, AlertCircle, Loader2, Check, ChevronsUpDown, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { nigerianSchools } from "@/data/nigerian-schools";
import { TygerAvatar } from "tyger-avatar";
import "tyger-avatar/lib/bundle/styles.css";

const bankAccountSchema = z.object({
  bank_account_name: z.string().min(2, 'Account name is required'),
  bank_account_number: z.string().regex(/^\d{10}$/, 'Account number must be 10 digits'),
  bank_name: z.string().min(2, 'Bank name is required'),
  bank_code: z.string().min(3, 'Bank code is required'),
});

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  gender: z.enum(['male', 'female', 'other']).optional(),
  school: z.string().min(2, 'Please enter or select your school'),
  avatar_name: z.string().min(1, 'Please select an avatar'),
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;
type ProfileFormData = z.infer<typeof profileSchema>;

const maleAvatars = ['TrEric', 'TrTorsten', 'TrIggy', 'TrFranklin', 'TrImran', 'TrAlex', 'TrFelix', 'TrEnrique', 'TrHarry', 'TrStu', 'TrChad'];
const femaleAvatars = ['TrChelsea', 'TrSamantha', 'TrMaria', 'TrRachel', 'TrShamila', 'TrSophia', 'TrHelen', 'TrNancy'];
const otherAvatars = ['TrAlex', 'TrFelix', 'TrSophia', 'TrHarry', 'TrHelen'];

const Settings = () => {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifiedAccountName, setVerifiedAccountName] = useState<string | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [bankOpen, setBankOpen] = useState(false);
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [customSchool, setCustomSchool] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

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
          setError('No banks available. Please check if the Edge Function is deployed.');
        }
      } catch (err: any) {
        console.error('Failed to fetch banks:', err);
        const errorMsg = err.message || 'Failed to load banks';
        
        // Provide helpful error message
        if (errorMsg.includes('not deployed') || errorMsg.includes('not available')) {
          setError(
            'Bank service is not available. ' +
            'The Edge Function needs to be deployed. ' +
            'Please deploy it using: supabase functions deploy get-paystack-banks'
          );
        } else {
          setError(errorMsg);
        }
      } finally {
        setBanksLoading(false);
      }
    };

    if (profile?.id) {
      fetchBanks();
    }
  }, [profile?.id]);

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
    setValue,
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
  const handleBankSelect = (bankName: string) => {
    const selectedBank = banks.find(bank => bank.name === bankName);
    if (selectedBank) {
      const currentAccountNumber = watch('bank_account_number') || '';
      const currentAccountName = watch('bank_account_name') || '';
      
      // Clear verification status when bank changes
      setVerifiedAccountName(null);
      setError(null);
      
      // Update form values using setValue
      setValue('bank_name', selectedBank.name, { shouldValidate: true });
      setValue('bank_code', selectedBank.code, { shouldValidate: true });
      
      // Keep existing account number and name
      if (currentAccountNumber) {
        setValue('bank_account_number', currentAccountNumber);
      }
      if (currentAccountName) {
        setValue('bank_account_name', currentAccountName);
      }
      
      setBankOpen(false);
    }
  };

  const selectedBankName = watch('bank_name');
  const sortedBanks = [...banks].sort((a, b) => a.name.localeCompare(b.name));

  const handleVerify = async () => {
    const accountNumber = watch('bank_account_number');
    const bankCode = watch('bank_code');
    const currentAccountName = watch('bank_account_name');

    if (!bankCode || !accountNumber) {
      setError('Please select a bank and enter your account number first');
      return;
    }

    if (accountNumber.length !== 10) {
      setError('Account number must be exactly 10 digits');
      return;
    }

    setVerifying(true);
    setError(null);
    setVerifiedAccountName(null);

    try {
      const result = await verifyBankAccount({
        account_number: accountNumber,
        bank_code: bankCode,
      });

      if (result.verified && result.account_name) {
        setVerifiedAccountName(result.account_name);
        
        // Auto-fill the verified account name
        reset({
          bank_account_name: result.account_name,
          bank_account_number: accountNumber,
          bank_name: watch('bank_name'),
          bank_code: bankCode,
        }, { keepValues: false });

        // If user had entered a different account name, show a warning
        if (currentAccountName && 
            currentAccountName.toLowerCase() !== result.account_name.toLowerCase()) {
          // Don't set error, just show success with info
          console.log(`Account name updated from "${currentAccountName}" to "${result.account_name}"`);
        }
      } else {
        setError(result.error || 'Account verification failed. Please check your account number and bank code.');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      const errorMessage = err.message || 'Failed to verify account. Please try again.';
      setError(errorMessage);
    } finally {
      setVerifying(false);
    }
  };

  const onSubmit = async (data: BankAccountFormData) => {
    setError(null);
    setVerifying(true);

    try {
      // Verify account before saving
      const verifyResult = await verifyBankAccount({
        account_number: data.bank_account_number,
        bank_code: data.bank_code,
      });

      if (!verifyResult.verified) {
        setError(verifyResult.error || 'Account verification failed. Please verify your account details before saving.');
        setVerifying(false);
        return;
      }

      // Check if account name matches (case-insensitive)
      if (verifyResult.account_name) {
        const verifiedName = verifyResult.account_name.toLowerCase().trim();
        const enteredName = data.bank_account_name.toLowerCase().trim();
        
        if (verifiedName !== enteredName) {
          setError(`Account name mismatch. The verified account name is: "${verifyResult.account_name}". Please update it and try again.`);
          // Auto-update the form with the correct account name
          reset({
            ...data,
            bank_account_name: verifyResult.account_name,
          });
          setVerifying(false);
          return;
        }
      }

      // If verified and account name matches, save with verified status
      mutation.mutate({
        ...data,
        is_bank_verified: true,
      });
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to verify and save account. Please try again.');
      setVerifying(false);
    }
  };

  // Profile form - must be called before any conditional returns
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    watch: watchProfile,
    setValue: setValueProfile,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      gender: (profile?.gender as 'male' | 'female' | 'other') || undefined,
      school: profile?.school || '',
      avatar_name: profile?.avatar_name || '',
    },
  });

  // Update profile form when profile loads
  useEffect(() => {
    if (profile) {
      resetProfile({
        full_name: profile.full_name || '',
        gender: (profile.gender as 'male' | 'female' | 'other') || undefined,
        school: profile.school || '',
        avatar_name: profile.avatar_name || '',
      });
    }
  }, [profile, resetProfile]);

  const profileGender = watchProfile('gender');
  const profileAvatarName = watchProfile('avatar_name');
  const profileSchool = watchProfile('school');

  const availableAvatars = profileGender === 'male' 
    ? maleAvatars 
    : profileGender === 'female' 
    ? femaleAvatars 
    : otherAvatars;

  const profileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => updateUserProfile(profile!.id, {
      full_name: data.full_name,
      gender: data.gender || null,
      school: data.school,
      avatar_name: data.avatar_name,
    }),
    onSuccess: async () => {
      setProfileSuccess(true);
      setError(null);
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['creator-profile', profile?.id] });
      setTimeout(() => setProfileSuccess(false), 3000);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to update profile');
      setProfileSuccess(false);
    },
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    setError(null);
    profileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your profile and payout details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Section */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-1">Profile Information</h3>
          <p className="text-sm text-muted-foreground">
            Update your personal information and avatar
          </p>
        </div>

        {profileSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm">Profile updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="profile_full_name">Full Name</Label>
            <Input
              id="profile_full_name"
              type="text"
              placeholder="John Doe"
              {...registerProfile('full_name')}
              className={cn("mt-2", profileErrors.full_name && 'border-destructive')}
            />
            {profileErrors.full_name && (
              <p className="text-sm text-destructive mt-1">{profileErrors.full_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="profile_email">Email</Label>
            <Input
              id="profile_email"
              type="email"
              value={profile?.email || ''}
              readOnly
              className="mt-2 bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
          </div>

          <div>
            <Label>Gender</Label>
            <RadioGroup
              value={profileGender}
              onValueChange={(value) => setValueProfile('gender', value as 'male' | 'female' | 'other')}
              className="mt-2"
            >
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50">
                <RadioGroupItem value="male" id="profile_male" />
                <Label htmlFor="profile_male" className="cursor-pointer flex-1">
                  Male
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50">
                <RadioGroupItem value="female" id="profile_female" />
                <Label htmlFor="profile_female" className="cursor-pointer flex-1">
                  Female
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50">
                <RadioGroupItem value="other" id="profile_other" />
                <Label htmlFor="profile_other" className="cursor-pointer flex-1">
                  Other
                </Label>
              </div>
            </RadioGroup>
            {profileErrors.gender && (
              <p className="text-sm text-destructive mt-1">{profileErrors.gender.message}</p>
            )}
          </div>

          {profileGender && (
            <div>
              <Label>Choose Your Avatar</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {availableAvatars.map((avatar) => (
                  <button
                    key={avatar}
                    type="button"
                    onClick={() => setValueProfile('avatar_name', avatar, { shouldValidate: true })}
                    className={cn(
                      'p-2 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center',
                      profileAvatarName === avatar 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <TygerAvatar name={avatar as any} size="sm" rounded />
                  </button>
                ))}
              </div>
              <input
                type="hidden"
                {...registerProfile('avatar_name')}
              />
              {profileErrors.avatar_name && (
                <p className="text-sm text-destructive mt-1">{profileErrors.avatar_name.message}</p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="profile_school">School</Label>
            <Popover open={schoolOpen} onOpenChange={setSchoolOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={schoolOpen}
                  className="w-full justify-between mt-2"
                >
                  {profileSchool || 'Select or enter your school...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search school or type to add custom..." 
                    onValueChange={(value) => {
                      setCustomSchool(value)
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="py-2 px-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            if (customSchool) {
                              setValueProfile('school', customSchool, { shouldValidate: true })
                              setSchoolOpen(false)
                              setCustomSchool('')
                            }
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add "{customSchool || 'Custom School'}"
                        </Button>
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {nigerianSchools.map((schoolItem) => (
                        <CommandItem
                          key={schoolItem}
                          value={schoolItem}
                          onSelect={() => {
                            setValueProfile('school', schoolItem, { shouldValidate: true })
                            setSchoolOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              profileSchool === schoolItem ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {schoolItem}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    {customSchool && !nigerianSchools.some(s => s.toLowerCase().includes(customSchool.toLowerCase())) && (
                      <CommandGroup>
                        <CommandItem
                          value={`add-${customSchool}`}
                          onSelect={() => {
                            setValueProfile('school', customSchool, { shouldValidate: true })
                            setSchoolOpen(false)
                            setCustomSchool('')
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add "{customSchool}"
                        </CommandItem>
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <input
              type="hidden"
              {...registerProfile('school')}
            />
            {profileErrors.school && (
              <p className="text-sm text-destructive mt-1">{profileErrors.school.message}</p>
            )}
          </div>

          <Button 
            type="submit" 
            variant="hero" 
            disabled={profileMutation.isPending} 
            className="w-full gap-2"
          >
            {profileMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <User className="w-4 h-4" />
                Save Profile
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Bank Account Section */}
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
          <div className="flex items-start gap-2 p-3 bg-blue-500/10 text-blue-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Account verified successfully!</p>
              <p className="text-sm mt-1">
                Account name: <strong>{verifiedAccountName}</strong>
              </p>
              <p className="text-xs mt-1 opacity-80">
                You can now save your bank details. The account name has been auto-filled.
              </p>
            </div>
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
              <Popover open={bankOpen} onOpenChange={setBankOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={bankOpen}
                    className={cn(
                      "w-full justify-between mt-2",
                      !selectedBankName && "text-muted-foreground"
                    )}
                  >
                    {selectedBankName || "Select a bank..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search bank..." />
                    <CommandList>
                      <CommandEmpty>No bank found.</CommandEmpty>
                      <CommandGroup>
                        {sortedBanks.map((bank) => (
                          <CommandItem
                            key={bank.code}
                            value={bank.name}
                            onSelect={(value) => {
                              // Command component passes the value, not the bank name directly
                              const bankToSelect = sortedBanks.find(b => 
                                b.name.toLowerCase() === value.toLowerCase() || 
                                b.name === value
                              );
                              if (bankToSelect) {
                                handleBankSelect(bankToSelect.name);
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedBankName === bank.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                      {bank.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            <input
              type="hidden"
              {...register('bank_name')}
            />
            {errors.bank_name && (
              <p className="text-sm text-destructive mt-1">{errors.bank_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="bank_code">Bank Code</Label>
            <Input
              id="bank_code"
              type="text"
              placeholder="Bank code (auto-filled when bank is selected)"
              {...register('bank_code')}
              readOnly
              className="mt-2 bg-muted"
            />
            {errors.bank_code && (
              <p className="text-sm text-destructive mt-1">{errors.bank_code.message}</p>
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
                inputMode="numeric"
                pattern="[0-9]*"
                {...register('bank_account_number')}
                onChange={(e) => {
                  // Only allow numbers
                  const value = e.target.value.replace(/\D/g, '');
                  setValue('bank_account_number', value);
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleVerify}
                disabled={
                  verifying || 
                  !watch('bank_code') || 
                  !watch('bank_account_number') || 
                  watch('bank_account_number')?.length !== 10
                }
                className="gap-2 whitespace-nowrap"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Account'
                )}
              </Button>
            </div>
            {errors.bank_account_number && (
              <p className="text-sm text-destructive mt-1">{errors.bank_account_number.message}</p>
            )}
            {watch('bank_account_number') && watch('bank_account_number').length !== 10 && (
              <p className="text-sm text-muted-foreground mt-1">
                Account number must be exactly 10 digits
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="bank_account_name">Account Name</Label>
            <Input
              id="bank_account_name"
              type="text"
              placeholder="Account name (auto-filled after verification)"
              {...register('bank_account_name')}
              readOnly={!!verifiedAccountName}
              className={cn(
                "mt-2",
                verifiedAccountName && "bg-muted"
              )}
            />
            {errors.bank_account_name && (
              <p className="text-sm text-destructive mt-1">{errors.bank_account_name.message}</p>
            )}
            {verifiedAccountName && (
              <p className="text-sm text-muted-foreground mt-1">
                ✓ Account name verified and auto-filled
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {!verifiedAccountName && !creatorProfile?.is_bank_verified && (
              <p className="text-sm text-muted-foreground text-center">
                💡 Tip: Click "Verify Account" to verify your account details before saving
              </p>
            )}
            <Button 
              type="submit" 
              variant="hero" 
              disabled={mutation.isPending || verifying} 
              className="w-full gap-2"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Bank Details'
              )}
            </Button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};

export default Settings;

