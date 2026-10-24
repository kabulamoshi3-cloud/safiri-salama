import React from 'react';
import { Link } from 'react-router-dom';
import { FaCar, FaMotorcycle, FaCheckCircle, FaGooglePlay, FaApple } from 'react-icons/fa';
import Button from '../components/Button';
import Card from '../components/Card';

const ServicesPage: React.FC = () => {
  const rideCategories = [
    {
      icon: FaCar,
      name: 'Car Ride',
      price: 'Sh 1,500/km',
      description: 'Comfortable and spacious rides for up to 4 passengers. Perfect for families or longer journeys.',
    },
    {
      icon: FaMotorcycle,
      name: 'Bajaji (Tuk-Tuk)',
      price: 'Sh 1,000/km',
      description: 'Affordable and convenient three-wheeler transport. Great for short trips around the city.',
    },
    {
      icon: FaMotorcycle,
      name: 'Boda Boda (Motorbike)',
      price: 'Sh 800/km',
      description: 'The fastest way to navigate traffic. Perfect for solo travelers in a hurry.',
    },
  ];

  const bookingSteps = [
    'Download or open the app',
    'Enter your destination',
    'Choose your ride type',
    'Pay and enjoy your trip',
  ];

  const features = [
    'Real-time GPS tracking',
    'In-app payments (M-Pesa, Tigopesa)',
    'Driver ratings & reviews',
    'Ride history & receipts',
    '24/7 customer support',
    'Safety features (SOS button)',
  ];

  return (
    <div>
      {/* Header Section */}
      <section className="bg-gradient-to-br from-primary to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Services</h1>
          <p className="text-xl max-w-3xl mx-auto">
            Choose from a variety of ride options to suit your needs and budget
          </p>
        </div>
      </section>

      {/* Ride Categories Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {rideCategories.map((category, index) => (
              <Card key={index} className="text-center">
                <category.icon className="text-primary text-5xl mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">{category.name}</h3>
                <p className="text-secondary text-xl font-semibold mb-4">
                  {category.price}
                </p>
                <p className="text-gray-700 mb-6">{category.description}</p>
                <Link to="/login?intent=book">
                  <Button variant="primary" fullWidth>
                    Book Now
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Process Timeline */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How to Book a Ride
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {bookingSteps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {index + 1}
                </div>
                <p className="text-lg font-semibold">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features List */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Choose Safiri Haraka?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start">
                <FaCheckCircle className="text-primary text-2xl mr-4 flex-shrink-0 mt-1" />
                <p className="text-lg">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download App Section */}
      <section className="py-16 bg-gradient-to-br from-primary to-blue-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8">
            Download the Safiri Haraka app today and enjoy hassle-free rides
          </p>

          {/* Passenger App */}
          <div className="mb-8">
            <p className="text-lg font-semibold mb-4">Download Safiri Haraka for Passengers</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a
                href="https://play.google.com/store/apps/details?id=com.safiriharaka.passenger"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-white text-gray-900 px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors font-semibold"
              >
                <FaGooglePlay className="text-xl" />
                <div className="text-left">
                  <div className="text-xs opacity-70">GET IT ON</div>
                  <div className="text-sm font-bold">Google Play</div>
                </div>
              </a>
              <a
                href="https://apps.apple.com/app/safiriharaka-passenger/id000000001"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-white text-gray-900 px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors font-semibold"
              >
                <FaApple className="text-xl" />
                <div className="text-left">
                  <div className="text-xs opacity-70">Download on the</div>
                  <div className="text-sm font-bold">App Store</div>
                </div>
              </a>
            </div>
          </div>

          {/* Driver App */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-6">
            <p className="text-sm font-semibold mb-1 opacity-80">Are you a driver?</p>
            <p className="text-lg font-semibold mb-4">Download Safiri Haraka for Drivers</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a
                href="https://play.google.com/store/apps/details?id=com.safiriharaka.driver"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-white text-gray-900 px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors font-semibold"
              >
                <FaGooglePlay className="text-xl" />
                <div className="text-left">
                  <div className="text-xs opacity-70">GET IT ON</div>
                  <div className="text-sm font-bold">Google Play</div>
                </div>
              </a>
              <a
                href="https://apps.apple.com/app/safiriharaka-driver/id000000002"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-white text-gray-900 px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors font-semibold"
              >
                <FaApple className="text-xl" />
                <div className="text-left">
                  <div className="text-xs opacity-70">Download on the</div>
                  <div className="text-sm font-bold">App Store</div>
                </div>
              </a>
            </div>
          </div>

          <p className="text-xs mt-6 opacity-60">
            Links will be updated when apps are published on the stores.
          </p>
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;
