import { Circle } from "lucide-react";
import { UserSchool } from "quickjobs-api-wrapper";
import { getSchoolStatusString } from "./../helpers";

interface Experience {
  id: number;
  createdAt?: string;
  updatedAt?: string;
  title: string;
  companyName: string;
}

interface Area {
  id: number;
  name: string;
  placeId: number;
  place: {
    address: string;
  };
}

interface SkillPreviewProps {
  experience?: Experience[] | null;
  skills?: string[] | null;
  userSchools?: UserSchool[] | null;
  areas?: Area[] | null;
}

export const SkillsPreview = ({
  experience = [],
  skills,
  userSchools,
  areas,
}: SkillPreviewProps) => {
  const renderExperience = () => {
    if (!experience || experience.length === 0) {
      return null;
    }
    return (
      <div className="w-full">
        {experience.map((item, index) => (
          <div key={index} className="pb-2 pr-10">
            <p className="text-[#002d48] text-sm">
              <strong>{item.title}</strong> - {item.companyName}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderSkills = () => {
    if (!skills) {
      return null;
    }

    return (
      <div className="flex flex-row">
        <div>
          {skills.map((skill, index) => (
            <div key={index} className="pb-2">
              <p className="text-[#002d48] flex items-center text-sm">
                <Circle
                  className="text-emerald-500 mr-1"
                  size={8}
                  fill="#58ce88"
                />
                {skill}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSchools = () => {
    if (!userSchools) {
      return null;
    }
    return (
      <div>
        {userSchools.map((item) => (
          <div key={item.id} className="pb-2 pr-10">
            <p className="text-[#002d48] text-sm">
              <strong>
                {item.school.id === 1465
                  ? item.otherText || "Nevyplněná škola"
                  : item.school.name}
              </strong>{" "}
              {item.schoolFaculty && `(${item.schoolFaculty?.name})`}{" "}
              {item.school.city && `(${item.school.city})`} -{" "}
              {getSchoolStatusString(item.status)}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderAreas = () => {
    if (!areas || areas.length === 0) {
      return null;
    }

    const uniqueAreas = areas.filter(
      (area, index, self) =>
        index === self.findIndex((a) => a.name === area.name)
    );

    return (
      <div>
        <h3 className="text-[#002d48] text-md font-medium underline mb-2">
          Lokace
        </h3>
        {uniqueAreas.map((area) => (
          <div key={area.id} className="pb-2">
            <p className="text-[#002d48]">{area.place.address}</p>
          </div>
        ))}
      </div>
    );
  };

  const hasExperience = experience && experience.length > 0;
  const hasSkills = skills && skills.length > 0;
  const hasSchools = userSchools && userSchools.length > 0;
  const hasAreas = areas && areas.length > 0;

  if (!hasExperience && !hasSkills && !hasSchools && !hasAreas) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="flex flex-row space-x-4 pt-0">
        {(hasSchools || hasExperience || hasAreas) && (
          <div className="flex flex-col w-full pl-24 pr-10">
            {hasExperience && (
              <div>
                <h3 className="text-[#002d48] text-md font-medium underline mb-2">
                  Zkušenosti
                </h3>
                {renderExperience()}
              </div>
            )}
            {hasSchools && (
              <div className={hasExperience ? "pt-4" : ""}>
                <h3 className="text-[#002d48] text-md font-medium underline mb-2">
                  Vzdělání
                </h3>
                {renderSchools()}
              </div>
            )}
            {hasAreas && (
              <div className={hasSchools || hasExperience ? "pt-4" : ""}>
                {renderAreas()}
              </div>
            )}
          </div>
        )}
        {hasSkills && (
          <div className="w-2/5 pl-0">
            <h3 className="text-[#002d48] text-md font-medium underline mb-2">
              Dovednosti
            </h3>
            {renderSkills()}
          </div>
        )}
      </div>
    </div>
  );
};
