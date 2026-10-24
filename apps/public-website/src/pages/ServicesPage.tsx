import React from 'react';
import { Link } from 'react-router-dom';
import { FaCar, FaMotorcycle, FaCheckCircle } from 'react-icons/fa';
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
            Why Choose DalaSmart?
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
            Download the DalaSmart app today and enjoy hassle-free rides
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <div className="bg-white/20 backdrop-blur px-8 py-4 rounded-lg cursor-not-allowed">
              <p className="font-semibold">App Store</p>
              <p className="text-sm">Coming Soon</p>
            </div>
            <div className="bg-white/20 backdrop-blur px-8 py-4 rounded-lg cursor-not-allowed">
              <p className="font-semibold">Google Play</p>
              <p className="text-sm">Coming Soon</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;
