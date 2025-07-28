// src/components/CourseCard.tsx
import React, { JSX } from "react";
import { Star } from "lucide-react";

// Define a type for course data
export type Course = {
  id: number;
  title: string;
  instructor: string;
  description: string;
  rating: string;
  reviews: string;
  level: string;
  duration: string;
  image: string;
};

// Accessible star rating component styled to match the image
const Rating = ({ rating, reviews }: { rating: number; reviews:string }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5; // Render a half-filled star for .5 and above
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1.5"  aria-label={`Rating: ${rating} out of 5 stars`}>
      <div className="font-semibold text-[#566fe9] text-base">{rating.toFixed(1)}</div>
      <div className="flex items-center">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="w-4 h-4 text-[#566fe9] fill-current" />
        ))}
        {/* Using a star with a mask for a true half-star is complex, a filled star is a close approximation as in image */}
        {halfStar && <Star key="half" className="w-4 h-4 text-[#566fe9] fill-current" />} 
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
        ))}
      </div>
      <div className="text-sm text-gray-500">({reviews} reviews)</div>
    </div>
  );
};

interface CourseCardProps {
  course: Course;
  isActive?: boolean; // To show the blue bar, like in the first card of the image
}

const CourseCard = ({ course, isActive = false }: CourseCardProps): JSX.Element => {
  return (
    // Use `group` for hover effects
    <div className="group relative h-full w-full overflow-hidden min-h-48 rounded-xl bg-white border border-gray-200/80 transition-all duration-300 hover:border-blue-300 hover:shadow-md hover:shadow-blue-100">
      {/* Blue indicator bar - visible if active or on hover */}
      <div className={`absolute left-0 top-0 h-full w-1.5 bg-[#ffffff] transition-transform duration-300 ease-out ${isActive ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'}`}></div>
      
      <div className="flex flex-col md:flex-row items-center gap-5 p-4 h-full">
        <img
          className="w-full h-48 md:w-[200px] md:h-[150px] object-cover rounded-lg flex-shrink-0"
          alt={course.title}
          src={course.image}
        />
        <div className="flex flex-col items-start gap-2.5 w-full">
          <div className="flex flex-col items-start self-stretch">
            <h3 className="font-semibold text-gray-900 text-lg">
              {course.title}
            </h3>
            <p className="text-sm text-gray-500">
              {course.instructor}
            </p>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {course.description}
          </p>
          <div className="flex flex-col items-start gap-2 mt-2 w-full">
            <Rating rating={parseFloat(course.rating)} reviews={course.reviews} />
            <p className="text-sm text-gray-500">
              {course.level} · {course.duration}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;