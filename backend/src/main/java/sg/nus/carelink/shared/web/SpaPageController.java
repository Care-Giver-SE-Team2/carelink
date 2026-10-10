package sg.nus.carelink.shared.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * SPA document routes, so a reload or a shared link opens the page instead of failing on a
 * path only React Router knows. Each role's whole prefix is forwarded, so a new page does not
 * need a backend change. Only document routes belong here: API and asset failures must
 * retain their real HTTP status.
 */
@Controller
class SpaPageController {
    @GetMapping({"/apply", "/manager/**", "/caregiver/**", "/family/**", "/elder/**"})
    String page() {
        return "forward:/index.html";
    }
}
