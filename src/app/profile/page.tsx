import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Edit, LogOut, Calendar, Bell, Shield, Mail } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { userAppointments, pastAppointments } from '@/lib/data';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function ProfilePage() {
  const avatarImage = PlaceHolderImages.find((img) => img.id === 'profile_avatar');

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card className="shadow-lg">
            <CardHeader className="items-center text-center p-6">
              <Avatar className="w-24 h-24 mb-4">
                {avatarImage && <AvatarImage src={avatarImage.imageUrl} alt="Jane Doe" data-ai-hint={avatarImage.imageHint} />}
                <AvatarFallback>
                  <User className="w-12 h-12" />
                </AvatarFallback>
              </Avatar>
              <CardTitle className="font-headline text-2xl">Jane Doe</CardTitle>
              <CardDescription>jane.doe@example.com</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button variant="outline" className="w-full">
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
              <Button variant="destructive" className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <Calendar className="text-primary" />
                Upcoming Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userAppointments.length > 0 ? (
                <ul className="space-y-4">
                  {userAppointments.map((apt) => (
                    <li key={apt.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                        <div>
                            <p className="font-semibold">{apt.serviceName}</p>
                            <p className="text-sm text-muted-foreground">{format(apt.date, 'EEEE, MMM d')} at {apt.time}</p>
                        </div>
                        <Button variant="outline" size="sm">Manage</Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-4">You have no upcoming appointments.</p>
              )}
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <Calendar className="text-primary" />
                Past Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pastAppointments.length > 0 ? (
                <ul className="space-y-4">
                  {pastAppointments.map((apt) => (
                    <li key={apt.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                        <div>
                            <p className="font-semibold">{apt.serviceName}</p>
                            <p className="text-sm text-muted-foreground">{format(apt.date, 'EEEE, MMM d')} at {apt.time}</p>
                        </div>
                        <Button variant="secondary" size="sm">Book Again</Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-4">You have no past appointments.</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <Bell className="text-primary" />
                Notification Settings
              </CardTitle>
              <CardDescription>Manage how we communicate with you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <Label htmlFor="promo-notifications" className="flex flex-col gap-1">
                  <span className="font-semibold">Promotional Notifications</span>
                  <span className="text-sm text-muted-foreground">Receive updates on special offers and new services.</span>
                </Label>
                <Switch id="promo-notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <Label htmlFor="reminder-notifications" className="flex flex-col gap-1">
                  <span className="font-semibold">Appointment Reminders</span>
                   <span className="text-sm text-muted-foreground">Get reminders for your upcoming appointments.</span>
                </Label>
                <Switch id="reminder-notifications" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
