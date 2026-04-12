// NASA Mars Mission Data
// Using nasa.gov open APIs (public domain, free API key)

// Mars Rover Photos API — curated selection of photos with rich metadata
export const MARS_ROVERS = ['curiosity', 'opportunity', 'spirit'] as const;

// NASA Open API endpoints
export const NASA_API_BASE = 'https://api.nasa.gov';

// Mars rover photo sols (Martian days) with known interesting data
export const CURIOSITY_SOLS = [1, 10, 50, 100, 200, 500, 1000, 1500, 2000, 2500];
export const OPPORTUNITY_SOLS = [1, 10, 50, 100, 500, 1000, 2000, 3000, 4000, 5000];
export const SPIRIT_SOLS = [1, 10, 50, 100, 500, 1000, 1500, 2000];

// Mars weather InSight data
export const INSIGHT_WEATHER_URL = `${NASA_API_BASE}/insight_weather/`;

// We'll also include some curated Mars mission facts as markdown
export const MARS_MISSION_FACTS = [
  {
    title: 'Curiosity Rover',
    content: `NASA's Curiosity rover landed on Mars on August 6, 2012, in Gale Crater. It is a car-sized rover designed to explore the crater as part of NASA's Mars Science Laboratory mission. Curiosity's goals include investigating Mars' climate and geology, assessing whether the selected field site inside Gale Crater has ever offered environmental conditions favorable for microbial life, and planetary habitability studies in preparation for human exploration. The rover carries the most advanced payload of scientific gear ever used on the Martian surface. It is 3 meters long, 2.7 meters wide, and 2.2 meters tall, weighing 899 kilograms.`,
  },
  {
    title: 'Opportunity Rover',
    content: `Opportunity, also known as MER-B or MER-1, is a robotic rover that was active on Mars from 2004 until 2018. Launched on July 7, 2003, it landed in Meridiani Planum on January 25, 2004. Designed to last just 90 Martian days and travel 1,100 meters, Opportunity vastly surpassed all expectations regarding endurance, scientific value, and longevity. The rover operated for 5,352 sols (5,498 Earth days) and traveled 45.16 kilometers. Its mission ended on June 10, 2018, when it lost contact during a planet-wide dust storm.`,
  },
  {
    title: 'Spirit Rover',
    content: `Spirit, also known as MER-A or MER-2, is a robotic rover on Mars that was active from 2004 to 2010. It was one of two rovers of NASA's Mars Exploration Rover Mission. Spirit landed successfully on Mars at 04:35 Ground UTC on January 4, 2004, three weeks before its twin Opportunity. The rover became stuck in soft soil in late 2009 and its last communication with Earth was on March 22, 2010. Spirit far exceeded its planned 90-sol mission, lasting over 2,208 sols.`,
  },
  {
    title: 'Perseverance Rover',
    content: `Perseverance, nicknamed Percy, is a car-sized Mars rover designed to explore the Jezero crater on Mars as part of NASA's Mars 2020 mission. It was manufactured by the Jet Propulsion Laboratory and launched on July 30, 2020. Perseverance landed on Mars on February 18, 2021. The rover carries seven primary payload instruments, nineteen cameras, and two microphones. It also carried the Ingenuity helicopter, which achieved the first powered controlled flight on another planet on April 19, 2021.`,
  },
  {
    title: 'Mars Climate and Atmosphere',
    content: `Mars has a thin atmosphere composed primarily of carbon dioxide (95.32%), nitrogen (2.7%), and argon (1.6%). The atmospheric pressure on the surface averages about 600 pascals (0.6 kPa), less than 1% of Earth's. Temperatures on Mars average about minus 60 degrees Celsius, with a low of minus 140 degrees Celsius during winter at the poles. Dust storms on Mars can grow to encompass the entire planet, as occurred in 2018 when the global dust storm ended the Opportunity rover's mission.`,
  },
  {
    title: 'Mars Geology',
    content: `Mars has two distinct geological hemispheres: the heavily cratered southern highlands and the smoother northern lowlands. Olympus Mons, the tallest mountain in the solar system at 21.9 kilometers, is a shield volcano on Mars. Valles Marineris is a system of canyons that runs along the Martian equator for 4,000 kilometers, up to 7 kilometers deep. Evidence from rover missions suggests that liquid water once existed on the surface, with geological features including river channels, lake beds, and mineral deposits that form in the presence of water.`,
  },
];
