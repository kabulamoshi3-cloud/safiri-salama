import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaHeadset,
  FaShieldAlt,
  FaStar,
  FaGooglePlay,
  FaApple,
} from 'react-icons/fa';
import Button from '../components/Button';
import Card from '../components/Card';

const HomePage: React.FC = () => {
  const benefits = [
    {
      icon: FaMapMarkerAlt,
      title: 'GPS Tracking',
      description: 'Real-time route optimization for faster journeys',
    },
    {
      icon: FaMoneyBillWave,
      title: 'Fair Prices',
      description: 'Transparent pricing with no hidden fees',
    },
    {
      icon: FaHeadset,
      title: '24/7 Support',
      description: 'We are always available to help you',
    },
    {
      icon: FaShieldAlt,
      title: 'Safe Drivers',
      description: 'All drivers are verified and background-checked',
    },
  ];

  const testimonials = [
    {
      name: 'Amina T.',
      text: 'DalaSmart has made my daily commute so much easier. The drivers are professional and the prices are fair.',
      rating: 5,
    },
    {
      name: 'John M.',
      text: 'I love the GPS tracking feature. I always know when my ride will arrive and can plan accordingly.',
      rating: 5,
    },
    {
      name: 'Fatuma S.',
      text: 'Safe, reliable, and affordable. DalaSmart is my go-to for getting around Dar es Salaam.',
      rating: 5,
    },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            DalaSmart — Smart, safe & affordable transport in Tanzania 🇹🇿
          </h1>
          <p className="text-xl md:text-2xl mb-8">
            Karibu! Your journey starts here
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
            <Link to="/login?intent=book">
              <Button variant="primary">Book a Ride</Button>
            </Link>
            <Link to="/become-a-driver">
              <Button variant="secondary">Become a Driver</Button>
            </Link>
          </div>
          <p className="text-sm opacity-90">
            Trusted by 10,000+ passengers across Tanzania
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index}>
                <benefit.icon className="text-primary text-4xl mb-4" />
                <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Service Coverage Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">Where We Operate</h2>
          <p className="text-lg text-gray-700 mb-6 max-w-3xl mx-auto">
            We currently operate in Tanzania's major cities and are rapidly expanding to serve you better.
          </p>
          <div className="max-w-2xl mx-auto">
            <ul className="text-left space-y-2 text-lg">
              <li className="flex items-center">
                <FaMapMarkerAlt className="text-primary mr-3" />
                Dar es Salaam
              </li>
              <li className="flex items-center">
                <FaMapMarkerAlt className="text-primary mr-3" />
                Dodoma
              </li>
            </ul>
            <p className="text-gray-600 mt-6">
              We have plans to expand to 10 cities by 2026!
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-primary text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <h3 className="text-4xl md:text-5xl font-bold mb-2">10K+</h3>
              <p className="text-xl">Rides</p>
            </div>
            <div>
              <h3 className="text-4xl md:text-5xl font-bold mb-2">500+</h3>
              <p className="text-xl">Drivers</p>
            </div>
            <div>
              <h3 className="text-4xl md:text-5xl font-bold mb-2">2</h3>
              <p className="text-xl">Cities</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            What Our Customers Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <div className="flex mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <FaStar key={i} className="text-secondary" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4">{testimonial.text}</p>
                <p className="font-semibold text-primary">{testimonial.name}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Download CTA Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Download the DalaSmart App
          </h2>

          {/* Passenger App */}
          <div className="mb-10">
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Download DalaSmart for Passengers</h3>
            <p className="text-gray-600 mb-4 text-sm">Book rides, track your driver, pay seamlessly</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a
                href="https://play.google.com/store/apps/details?id=com.dalasmart.passenger"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition-colors"
              >
                <FaGooglePlay size={24} />
                <div className="text-left">
                  <div className="text-xs opacity-80">GET IT ON</div>
                  <div className="text-sm font-bold">Google Play</div>
                </div>
              </a>
              <a
                href="https://apps.apple.com/app/dalasmart-passenger/id000000001"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition-colors"
              >
                <FaApple size={24} />
                <div className="text-left">
                  <div className="text-xs opacity-80">Download on the</div>
                  <div className="text-sm font-bold">App Store</div>
                </div>
              </a>
            </div>
          </div>

          {/* Driver App */}
          <div className="bg-gray-50 rounded-2xl p-6">
            <p className="text-primary font-semibold mb-1">Are you a driver?</p>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Download DalaSmart for Drivers</h3>
            <p className="text-gray-600 mb-4 text-sm">Accept rides, track earnings, manage your profile</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a
                href="https://play.google.com/store/apps/details?id=com.dalasmart.driver"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition-colors"
              >
                <FaGooglePlay size={24} />
                <div className="text-left">
                  <div className="text-xs opacity-80">GET IT ON</div>
                  <div className="text-sm font-bold">Google Play</div>
                </div>
              </a>
              <a
                href="https://apps.apple.com/app/dalasmart-driver/id000000002"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition-colors"
              >
                <FaApple size={24} />
                <div className="text-left">
                  <div className="text-xs opacity-80">Download on the</div>
                  <div className="text-sm font-bold">App Store</div>
                </div>
              </a>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            Links will be updated when apps are published on the stores.
          </p>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
