import React from 'react';
import { FaShieldAlt, FaEye, FaUsers, FaLightbulb } from 'react-icons/fa';
import Card from '../components/Card';

const AboutPage: React.FC = () => {
  const values = [
    {
      icon: FaShieldAlt,
      title: 'Safety',
      description:
        'We prioritize the safety of our passengers and drivers with verified identities, GPS tracking, and 24/7 monitoring.',
    },
    {
      icon: FaEye,
      title: 'Transparency',
      description:
        'No hidden fees or surprises. We believe in clear pricing and honest communication at every step.',
    },
    {
      icon: FaUsers,
      title: 'Community',
      description:
        'We are building a community of drivers and passengers who trust and support each other.',
    },
    {
      icon: FaLightbulb,
      title: 'Innovation',
      description:
        'We leverage technology to solve real problems and make transportation accessible to everyone.',
    },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            About Safiri Haraka
          </h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto">
            Transforming transportation across Tanzania
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Mission</h2>
          <p className="text-xl text-gray-700">
            To make safe, affordable, and reliable transport accessible to every
            Tanzanian.
          </p>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Vision</h2>
          <p className="text-xl text-gray-700">
            A Tanzania where distance is never a barrier to opportunity.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Our Story
          </h2>
          <div className="space-y-6 text-lg text-gray-700">
            <p>
              Safiri Haraka was founded in 2023 by a team of Tanzanian engineers who saw
              the daily struggles of commuters in Dar es Salaam. Long waits, uncertain
              pricing, and safety concerns were barriers that prevented people from
              accessing reliable transportation.
            </p>
            <p>
              We built a platform that combines GPS routing, mobile payments (M-Pesa,
              Tigopesa), and driver vetting to create a trustworthy ride experience.
              Our technology empowers both passengers and drivers, making every journey
              safer, faster, and more affordable.
            </p>
            <p>
              Starting in Dar es Salaam, we expanded to Dodoma in 2024 and have plans
              to reach 10 cities by 2026. With over 500 drivers and 10,000 rides
              completed, we are proud to be part of Tanzania's transportation future.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Our Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index}>
                <value.icon className="text-primary text-4xl mb-4" />
                <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Get in Touch
          </h2>
          <Card>
            <div className="space-y-4 text-lg">
              <div>
                <span className="font-semibold">Email: </span>
                <a
                  href="mailto:info@safiriharaka.co.tz"
                  className="text-primary hover:underline"
                >
                  info@safiriharaka.co.tz
                </a>
              </div>
              <div>
                <span className="font-semibold">Phone: </span>
                <a href="tel:+255700000000" className="text-primary hover:underline">
                  +255 700 000 000
                </a>
              </div>
              <div>
                <span className="font-semibold">Address: </span>
                <span className="text-gray-700">Dar es Salaam, Tanzania</span>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
