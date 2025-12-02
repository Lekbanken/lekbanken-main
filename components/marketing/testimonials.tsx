/* eslint-disable @next/next/no-img-element */

const featuredTestimonial = {
  body: "Lekbanken sparar oss timmar varje vecka och gör det enkelt att dela pass med vikarier.",
  author: {
    name: "Brenna Goyette",
    handle: "brennagoyette",
    imageUrl:
      "https://images.unsplash.com/photo-1550525811-e5869dd03032?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    logoUrl: "https://tailwindcss.com/plus-assets/img/logos/savvycal-logo-gray-900.svg",
  },
};

const testimonials = [
  [
    [
      {
        body: "Vi slipper Word-dokument och trådar i chatten. Allt finns i Lekbanken.",
        author: {
          name: "Leslie Alexander",
          handle: "lesliealexander",
          imageUrl:
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        },
      },
      {
        body: "Delning till föräldrar med ett klick är guld.",
        author: {
          name: "Michael Foster",
          handle: "michaelfoster",
          imageUrl:
            "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        },
      },
      {
        body: "Bra översikt över säkerhetsnotiser per aktivitet.",
        author: {
          name: "Dries Vincent",
          handle: "driesvincent",
          imageUrl:
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        },
      },
    ],
    [
      {
        body: "Passbiblioteket gör onboarding av nya ledare superenkelt.",
        author: {
          name: "Lindsay Walton",
          handle: "lindsaywalton",
          imageUrl:
            "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        },
      },
      {
        body: "Vi har en röd tråd mellan lektioner och träningar nu.",
        author: {
          name: "Courtney Henry",
          handle: "courtneyhenry",
          imageUrl:
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        },
      },
    ],
  ],
  [
    [
      {
        body: "Feedback direkt i appen gör att passen blir bättre varje vecka.",
        author: {
          name: "Tom Cook",
          handle: "tomcook",
          imageUrl:
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        },
      },
      {
        body: "Kalender och aktiviteter på samma ställe, äntligen.",
        author: {
          name: "Whitney Francis",
          handle: "whitneyfrancis",
          imageUrl:
            "https://images.unsplash.com/photo-1517365830460-955ce3ccd263?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        },
      },
    ],
    [
      {
        body: "Trygga samtycken och dokumentation i samma flöde.",
        author: {
          name: "Leonard Krasner",
          handle: "leonardkrasner",
          imageUrl:
            "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        },
      },
      {
        body: "Vi delar pass mellan skolor i kommunen, sparar tid för alla.",
        author: {
          name: "Floyd Miles",
          handle: "floydmiles",
          imageUrl:
            "https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        },
      },
      {
        body: "Lätt att filtrera på ålder och gruppstorlek – hittas direkt.",
        author: {
          name: "Emily Selman",
          handle: "emilyselman",
          imageUrl:
            "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        },
      },
    ],
  ],
];

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="relative isolate bg-background pt-20 pb-28 sm:pt-28"
      aria-labelledby="testimonials-title"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-primary">Testimonials</p>
          <h2
            id="testimonials-title"
            className="mt-2 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
          >
            Ledare och lärare som redan använder Lekbanken.
          </h2>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 grid-rows-1 gap-8 text-sm text-foreground sm:mt-20 sm:grid-cols-2 xl:mx-0 xl:max-w-none xl:grid-flow-col xl:grid-cols-4">
          <figure className="group relative rounded-2xl bg-card shadow-lg ring-1 ring-border transition-all duration-200 hover:shadow-xl sm:col-span-2 xl:col-start-2 xl:row-end-1">
            <blockquote className="p-6 text-lg font-semibold sm:p-12 sm:text-xl">
              <svg className="absolute top-6 left-6 h-8 w-8 text-primary/20 sm:top-10 sm:left-10 sm:h-10 sm:w-10" fill="currentColor" viewBox="0 0 32 32" aria-hidden="true">
                <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
              </svg>
              <p className="relative">&ldquo;{featuredTestimonial.body}&rdquo;</p>
            </blockquote>
            <figcaption className="flex flex-wrap items-center gap-4 border-t border-border px-6 py-4 sm:flex-nowrap">
              <img
                alt=""
                src={featuredTestimonial.author.imageUrl}
                className="h-10 w-10 flex-none rounded-full bg-muted ring-2 ring-primary/20"
              />
              <div className="flex-auto">
                <div className="font-semibold">{featuredTestimonial.author.name}</div>
                <div className="text-muted-foreground">{`@${featuredTestimonial.author.handle}`}</div>
              </div>
              <img alt="" src={featuredTestimonial.author.logoUrl} className="h-10 w-auto flex-none" />
            </figcaption>
          </figure>

          {testimonials.map((columnGroup, columnGroupIdx) => (
            <div key={columnGroupIdx} className="space-y-8 xl:contents xl:space-y-0">
              {columnGroup.map((column, columnIdx) => (
                <div
                  key={columnIdx}
                  className={cx(
                    (columnGroupIdx === 0 && columnIdx === 0) ||
                      (columnGroupIdx === testimonials.length - 1 && columnIdx === columnGroup.length - 1)
                      ? "xl:row-span-2"
                      : "xl:row-start-1",
                    "space-y-8",
                  )}
                >
                  {column.map((testimonial) => (
                    <figure
                      key={testimonial.author.handle}
                      className="group rounded-2xl bg-card p-6 shadow-lg ring-1 ring-border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                    >
                      <blockquote className="text-foreground">
                        <p>&ldquo;{testimonial.body}&rdquo;</p>
                      </blockquote>
                      <figcaption className="mt-6 flex items-center gap-4">
                        <img
                          alt=""
                          src={testimonial.author.imageUrl}
                          className="h-10 w-10 rounded-full bg-muted ring-2 ring-border transition-all group-hover:ring-primary/30"
                        />
                        <div>
                          <div className="font-semibold text-foreground">{testimonial.author.name}</div>
                          <div className="text-muted-foreground">{`@${testimonial.author.handle}`}</div>
                        </div>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
